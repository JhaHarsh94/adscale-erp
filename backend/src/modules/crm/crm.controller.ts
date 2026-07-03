import { Response } from "express";
import {
  ClientStatus,
  FollowUpStatus,
  FollowUpType,
  LeadSource,
  LeadStatus,
  SalesPipelineStage,
  type Prisma,
} from "@prisma/client";
import prisma from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { successResponse } from "../../utils/response";
import { getIO } from "../../config/socket";
import {
  importLeadsFromSheet,
  getSheetStatus as checkSheetStatus,
} from "../../services/googleSheets.service";

const employeeSelect = {
  id: true,
  employeeCode: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
};

const leadInclude: Prisma.LeadInclude = {
  assignedTo: {
    select: employeeSelect,
  },
  convertedClient: true,
  followUps: {
    orderBy: {
      scheduledAt: "asc",
    },
  },
  pipelineItems: {
    orderBy: {
      createdAt: "desc",
    },
  },
};

const clientInclude: Prisma.ClientInclude = {
  accountOwner: {
    select: employeeSelect,
  },
  convertedFromLead: true,
  contacts: {
    orderBy: [
      {
        isPrimary: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  },
  followUps: {
    orderBy: {
      scheduledAt: "asc",
    },
  },
  pipelineItems: {
    orderBy: {
      createdAt: "desc",
    },
  },
};

const followUpInclude: Prisma.FollowUpInclude = {
  lead: true,
  client: true,
  assignedTo: {
    select: employeeSelect,
  },
};

const pipelineInclude: Prisma.SalesPipelineInclude = {
  lead: true,
  client: true,
  owner: {
    select: employeeSelect,
  },
};

function trimOrNull(value?: string | null) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function numberOrNull(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new AppError("Numeric value is invalid", 400);
  }

  return parsed;
}

function dateOrNull(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Date value is invalid", 400);
  }

  return date;
}

function enumOrDefault<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
  fallback: T[keyof T],
  label: string
) {
  if (value === undefined || value === null || value === "") return fallback;

  const normalized = String(value);

  if (!Object.values(enumObject).includes(normalized)) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return normalized as T[keyof T];
}

function enumOrUndefined<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
  label: string
) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return undefined;

  const normalized = String(value);

  if (!Object.values(enumObject).includes(normalized)) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return normalized as T[keyof T];
}

async function assertEmployeeExists(employeeId?: string | null) {
  if (!employeeId) return;

  const employee = await prisma.employee.findUnique({
    where: {
      id: employeeId,
    },
  });

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }
}

async function assertLeadExists(leadId?: string | null) {
  if (!leadId) return;

  const lead = await prisma.lead.findUnique({
    where: {
      id: leadId,
    },
  });

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }
}

async function assertClientExists(clientId?: string | null) {
  if (!clientId) return;

  const client = await prisma.client.findUnique({
    where: {
      id: clientId,
    },
  });

  if (!client) {
    throw new AppError("Client not found", 404);
  }
}

/* =========================
   CRM Dashboard
========================= */

export const getCrmDashboard = asyncHandler(async (req, res: Response) => {
  const [
    totalLeads,
    qualifiedLeads,
    wonLeads,
    lostLeads,
    activeClients,
    pendingFollowUps,
    overdueFollowUps,
    openPipeline,
    wonPipeline,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: LeadStatus.QUALIFIED } }),
    prisma.lead.count({ where: { status: LeadStatus.WON } }),
    prisma.lead.count({ where: { status: LeadStatus.LOST } }),
    prisma.client.count({ where: { status: ClientStatus.ACTIVE } }),
    prisma.followUp.count({ where: { status: FollowUpStatus.PENDING } }),
    prisma.followUp.count({
      where: {
        status: FollowUpStatus.PENDING,
        scheduledAt: {
          lt: new Date(),
        },
      },
    }),
    prisma.salesPipeline.aggregate({
      where: {
        stage: {
          notIn: [SalesPipelineStage.WON, SalesPipelineStage.LOST],
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.salesPipeline.aggregate({
      where: {
        stage: SalesPipelineStage.WON,
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  return successResponse(res, 200, "CRM dashboard fetched successfully", {
    totalLeads,
    qualifiedLeads,
    wonLeads,
    lostLeads,
    activeClients,
    pendingFollowUps,
    overdueFollowUps,
    openPipelineValue: openPipeline._sum.amount || 0,
    wonPipelineValue: wonPipeline._sum.amount || 0,
  });
});

/* =========================
   Leads
========================= */

export const getLeads = asyncHandler(async (req, res: Response) => {
  const { status, source, assignedToId, search } = req.query;

  const where: Prisma.LeadWhereInput = {
    status: status
      ? enumOrDefault(LeadStatus, status, LeadStatus.NEW, "lead status")
      : undefined,
    source: source
      ? enumOrDefault(LeadSource, source, LeadSource.OTHER, "lead source")
      : undefined,
    assignedToId: assignedToId ? String(assignedToId) : undefined,
    OR: search
      ? [
          { companyName: { contains: String(search), mode: "insensitive" } },
          { contactName: { contains: String(search), mode: "insensitive" } },
          { email: { contains: String(search), mode: "insensitive" } },
          { phone: { contains: String(search), mode: "insensitive" } },
        ]
      : undefined,
  };

  const leads = await prisma.lead.findMany({
    where,
    include: leadInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return successResponse(res, 200, "Leads fetched successfully", leads);
});

export const getLeadById = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const lead = await prisma.lead.findUnique({
    where: {
      id,
    },
    include: leadInclude,
  });

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  return successResponse(res, 200, "Lead fetched successfully", lead);
});

export const createLead = asyncHandler(async (req, res: Response) => {
  const {
    companyName,
    contactName,
    email,
    phone,
    website,
    source,
    status,
    estimatedValue,
    notes,
    assignedToId,
  } = req.body;

  if (!companyName || !String(companyName).trim()) {
    throw new AppError("Company name is required", 400);
  }

  await assertEmployeeExists(assignedToId);

  const lead = await prisma.lead.create({
    data: {
      companyName: String(companyName).trim(),
      contactName: trimOrNull(contactName),
      email: trimOrNull(email),
      phone: trimOrNull(phone),
      website: trimOrNull(website),
      source: enumOrDefault(LeadSource, source, LeadSource.OTHER, "lead source"),
      status: enumOrDefault(LeadStatus, status, LeadStatus.NEW, "lead status"),
      estimatedValue: numberOrNull(estimatedValue),
      notes: trimOrNull(notes),
      assignedToId: assignedToId || null,
    },
    include: leadInclude,
  });

  try {
    getIO().emit("lead:created", lead);
  } catch {}

  return successResponse(res, 201, "Lead created successfully", lead);
});

export const updateLead = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const lead = await prisma.lead.findUnique({
    where: {
      id,
    },
  });

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  await assertEmployeeExists(req.body.assignedToId);

  const updatedLead = await prisma.lead.update({
    where: {
      id,
    },
    data: {
      companyName:
        req.body.companyName !== undefined
          ? String(req.body.companyName).trim()
          : undefined,
      contactName:
        req.body.contactName !== undefined
          ? trimOrNull(req.body.contactName)
          : undefined,
      email: req.body.email !== undefined ? trimOrNull(req.body.email) : undefined,
      phone: req.body.phone !== undefined ? trimOrNull(req.body.phone) : undefined,
      website:
        req.body.website !== undefined ? trimOrNull(req.body.website) : undefined,
      source: enumOrUndefined(LeadSource, req.body.source, "lead source"),
      status: enumOrUndefined(LeadStatus, req.body.status, "lead status"),
      estimatedValue:
        req.body.estimatedValue !== undefined
          ? numberOrNull(req.body.estimatedValue)
          : undefined,
      notes: req.body.notes !== undefined ? trimOrNull(req.body.notes) : undefined,
      assignedToId:
        req.body.assignedToId !== undefined
          ? req.body.assignedToId || null
          : undefined,
    },
    include: leadInclude,
  });

  try {
    getIO().emit("lead:updated", updatedLead);
  } catch {}

  return successResponse(res, 200, "Lead updated successfully", updatedLead);
});

export const deleteLead = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const lead = await prisma.lead.findUnique({
    where: {
      id,
    },
  });

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  await prisma.lead.delete({
    where: {
      id,
    },
  });

  try {
    getIO().emit("lead:deleted", { id });
  } catch {}

  return successResponse(res, 200, "Lead deleted successfully");
});

export const convertLeadToClient = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const lead = await prisma.lead.findUnique({
    where: {
      id,
    },
  });

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  if (lead.convertedClientId) {
    throw new AppError("Lead is already converted to a client", 409);
  }

  await assertEmployeeExists(req.body.accountOwnerId || lead.assignedToId);

  const client = await prisma.$transaction(async (tx) => {
    const createdClient = await tx.client.create({
      data: {
        name: String(req.body.name || lead.companyName).trim(),
        status: ClientStatus.ACTIVE,
        source: lead.source,
        industry: trimOrNull(req.body.industry),
        website: trimOrNull(req.body.website) || lead.website,
        email: trimOrNull(req.body.email) || lead.email,
        phone: trimOrNull(req.body.phone) || lead.phone,
        address: trimOrNull(req.body.address),
        notes: trimOrNull(req.body.notes) || lead.notes,
        retainerValue: numberOrNull(req.body.retainerValue),
        contractValue:
          numberOrNull(req.body.contractValue) || lead.estimatedValue,
        onboardedAt: dateOrNull(req.body.onboardedAt) || new Date(),
        accountOwnerId: req.body.accountOwnerId || lead.assignedToId || null,
      },
    });

    if (lead.contactName || lead.email || lead.phone) {
      await tx.clientContact.create({
        data: {
          clientId: createdClient.id,
          name: lead.contactName || `${lead.companyName} Contact`,
          email: lead.email,
          phone: lead.phone,
          isPrimary: true,
        },
      });
    }

    await tx.lead.update({
      where: {
        id: lead.id,
      },
      data: {
        status: LeadStatus.WON,
        convertedClientId: createdClient.id,
        convertedAt: new Date(),
      },
    });

    await tx.salesPipeline.create({
      data: {
        name: `${lead.companyName} Conversion`,
        stage: SalesPipelineStage.WON,
        amount: createdClient.contractValue || lead.estimatedValue || null,
        probability: 100,
        closedAt: new Date(),
        leadId: lead.id,
        clientId: createdClient.id,
        ownerId: createdClient.accountOwnerId,
      },
    });

    return tx.client.findUnique({
      where: {
        id: createdClient.id,
      },
      include: clientInclude,
    });
  });

  return successResponse(res, 201, "Lead converted to client successfully", client);
});

/* =========================
   Clients
========================= */

export const getClients = asyncHandler(async (req, res: Response) => {
  const { status, source, accountOwnerId, search } = req.query;

  const clients = await prisma.client.findMany({
    where: {
      status: status
        ? enumOrDefault(ClientStatus, status, ClientStatus.PROSPECT, "client status")
        : undefined,
      source: source
        ? enumOrDefault(LeadSource, source, LeadSource.OTHER, "lead source")
        : undefined,
      accountOwnerId: accountOwnerId ? String(accountOwnerId) : undefined,
      OR: search
        ? [
            { name: { contains: String(search), mode: "insensitive" } },
            { email: { contains: String(search), mode: "insensitive" } },
            { phone: { contains: String(search), mode: "insensitive" } },
            { industry: { contains: String(search), mode: "insensitive" } },
          ]
        : undefined,
    },
    include: clientInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return successResponse(res, 200, "Clients fetched successfully", clients);
});

export const getClientById = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const client = await prisma.client.findUnique({
    where: {
      id,
    },
    include: clientInclude,
  });

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  return successResponse(res, 200, "Client fetched successfully", client);
});

export const createClient = asyncHandler(async (req, res: Response) => {
  const {
    name,
    status,
    source,
    industry,
    website,
    email,
    phone,
    address,
    notes,
    retainerValue,
    contractValue,
    onboardedAt,
    accountOwnerId,
  } = req.body;

  if (!name || !String(name).trim()) {
    throw new AppError("Client name is required", 400);
  }

  await assertEmployeeExists(accountOwnerId);

  const client = await prisma.client.create({
    data: {
      name: String(name).trim(),
      status: enumOrDefault(
        ClientStatus,
        status,
        ClientStatus.PROSPECT,
        "client status"
      ),
      source: enumOrDefault(LeadSource, source, LeadSource.OTHER, "lead source"),
      industry: trimOrNull(industry),
      website: trimOrNull(website),
      email: trimOrNull(email),
      phone: trimOrNull(phone),
      address: trimOrNull(address),
      notes: trimOrNull(notes),
      retainerValue: numberOrNull(retainerValue),
      contractValue: numberOrNull(contractValue),
      onboardedAt: dateOrNull(onboardedAt),
      accountOwnerId: accountOwnerId || null,
    },
    include: clientInclude,
  });

  return successResponse(res, 201, "Client created successfully", client);
});

export const updateClient = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const client = await prisma.client.findUnique({
    where: {
      id,
    },
  });

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  await assertEmployeeExists(req.body.accountOwnerId);

  const updatedClient = await prisma.client.update({
    where: {
      id,
    },
    data: {
      name:
        req.body.name !== undefined ? String(req.body.name).trim() : undefined,
      status: enumOrUndefined(ClientStatus, req.body.status, "client status"),
      source: enumOrUndefined(LeadSource, req.body.source, "lead source"),
      industry:
        req.body.industry !== undefined ? trimOrNull(req.body.industry) : undefined,
      website:
        req.body.website !== undefined ? trimOrNull(req.body.website) : undefined,
      email: req.body.email !== undefined ? trimOrNull(req.body.email) : undefined,
      phone: req.body.phone !== undefined ? trimOrNull(req.body.phone) : undefined,
      address:
        req.body.address !== undefined ? trimOrNull(req.body.address) : undefined,
      notes: req.body.notes !== undefined ? trimOrNull(req.body.notes) : undefined,
      retainerValue:
        req.body.retainerValue !== undefined
          ? numberOrNull(req.body.retainerValue)
          : undefined,
      contractValue:
        req.body.contractValue !== undefined
          ? numberOrNull(req.body.contractValue)
          : undefined,
      onboardedAt:
        req.body.onboardedAt !== undefined
          ? dateOrNull(req.body.onboardedAt)
          : undefined,
      accountOwnerId:
        req.body.accountOwnerId !== undefined
          ? req.body.accountOwnerId || null
          : undefined,
    },
    include: clientInclude,
  });

  return successResponse(res, 200, "Client updated successfully", updatedClient);
});

export const deleteClient = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const client = await prisma.client.findUnique({
    where: {
      id,
    },
  });

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  await prisma.$transaction(async (tx) => {
    await tx.lead.updateMany({
      where: {
        convertedClientId: id,
      },
      data: {
        convertedClientId: null,
        convertedAt: null,
      },
    });

    await tx.clientContact.deleteMany({
      where: {
        clientId: id,
      },
    });

    await tx.followUp.updateMany({
      where: {
        clientId: id,
      },
      data: {
        clientId: null,
      },
    });

    await tx.salesPipeline.updateMany({
      where: {
        clientId: id,
      },
      data: {
        clientId: null,
      },
    });

    await tx.client.delete({
      where: {
        id,
      },
    });
  });

  return successResponse(res, 200, "Client deleted successfully");
});

/* =========================
   Client Contacts
========================= */

export const createClientContact = asyncHandler(async (req, res: Response) => {
  const { clientId } = req.params;
  const { name, designation, email, phone, isPrimary, notes } = req.body;

  if (!name || !String(name).trim()) {
    throw new AppError("Contact name is required", 400);
  }

  await assertClientExists(clientId);

  const contact = await prisma.$transaction(async (tx) => {
    if (isPrimary === true) {
      await tx.clientContact.updateMany({
        where: {
          clientId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return tx.clientContact.create({
      data: {
        clientId,
        name: String(name).trim(),
        designation: trimOrNull(designation),
        email: trimOrNull(email),
        phone: trimOrNull(phone),
        isPrimary: Boolean(isPrimary),
        notes: trimOrNull(notes),
      },
    });
  });

  return successResponse(res, 201, "Client contact created successfully", contact);
});

export const updateClientContact = asyncHandler(async (req, res: Response) => {
  const { contactId } = req.params;

  const contact = await prisma.clientContact.findUnique({
    where: {
      id: contactId,
    },
  });

  if (!contact) {
    throw new AppError("Client contact not found", 404);
  }

  const updatedContact = await prisma.$transaction(async (tx) => {
    if (req.body.isPrimary === true) {
      await tx.clientContact.updateMany({
        where: {
          clientId: contact.clientId,
          isPrimary: true,
          NOT: {
            id: contactId,
          },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return tx.clientContact.update({
      where: {
        id: contactId,
      },
      data: {
        name:
          req.body.name !== undefined ? String(req.body.name).trim() : undefined,
        designation:
          req.body.designation !== undefined
            ? trimOrNull(req.body.designation)
            : undefined,
        email:
          req.body.email !== undefined ? trimOrNull(req.body.email) : undefined,
        phone:
          req.body.phone !== undefined ? trimOrNull(req.body.phone) : undefined,
        isPrimary:
          req.body.isPrimary !== undefined ? Boolean(req.body.isPrimary) : undefined,
        notes:
          req.body.notes !== undefined ? trimOrNull(req.body.notes) : undefined,
      },
    });
  });

  return successResponse(
    res,
    200,
    "Client contact updated successfully",
    updatedContact
  );
});

export const deleteClientContact = asyncHandler(async (req, res: Response) => {
  const { contactId } = req.params;

  const contact = await prisma.clientContact.findUnique({
    where: {
      id: contactId,
    },
  });

  if (!contact) {
    throw new AppError("Client contact not found", 404);
  }

  await prisma.clientContact.delete({
    where: {
      id: contactId,
    },
  });

  return successResponse(res, 200, "Client contact deleted successfully");
});

/* =========================
   Follow Ups
========================= */

export const getFollowUps = asyncHandler(async (req, res: Response) => {
  const { status, leadId, clientId, assignedToId } = req.query;

  const followUps = await prisma.followUp.findMany({
    where: {
      status: status
        ? enumOrDefault(
            FollowUpStatus,
            status,
            FollowUpStatus.PENDING,
            "follow-up status"
          )
        : undefined,
      leadId: leadId ? String(leadId) : undefined,
      clientId: clientId ? String(clientId) : undefined,
      assignedToId: assignedToId ? String(assignedToId) : undefined,
    },
    include: followUpInclude,
    orderBy: {
      scheduledAt: "asc",
    },
  });

  return successResponse(res, 200, "Follow-ups fetched successfully", followUps);
});

export const createFollowUp = asyncHandler(async (req, res: Response) => {
  const {
    leadId,
    clientId,
    subject,
    type,
    status,
    scheduledAt,
    completedAt,
    outcome,
    nextFollowUpAt,
    notes,
    assignedToId,
  } = req.body;

  if (!subject || !String(subject).trim()) {
    throw new AppError("Follow-up subject is required", 400);
  }

  if (!scheduledAt) {
    throw new AppError("Follow-up scheduled date is required", 400);
  }

  if (!leadId && !clientId) {
    throw new AppError("Follow-up must be linked to a lead or client", 400);
  }

  await assertLeadExists(leadId);
  await assertClientExists(clientId);
  await assertEmployeeExists(assignedToId);

  const followUp = await prisma.followUp.create({
    data: {
      leadId: leadId || null,
      clientId: clientId || null,
      subject: String(subject).trim(),
      type: enumOrDefault(FollowUpType, type, FollowUpType.CALL, "follow-up type"),
      status: enumOrDefault(
        FollowUpStatus,
        status,
        FollowUpStatus.PENDING,
        "follow-up status"
      ),
      scheduledAt: dateOrNull(scheduledAt) as Date,
      completedAt: dateOrNull(completedAt),
      outcome: trimOrNull(outcome),
      nextFollowUpAt: dateOrNull(nextFollowUpAt),
      notes: trimOrNull(notes),
      assignedToId: assignedToId || null,
    },
    include: followUpInclude,
  });

  return successResponse(res, 201, "Follow-up created successfully", followUp);
});

export const updateFollowUp = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const followUp = await prisma.followUp.findUnique({
    where: {
      id,
    },
  });

  if (!followUp) {
    throw new AppError("Follow-up not found", 404);
  }

  await assertLeadExists(req.body.leadId);
  await assertClientExists(req.body.clientId);
  await assertEmployeeExists(req.body.assignedToId);

  const updatedFollowUp = await prisma.followUp.update({
    where: {
      id,
    },
    data: {
      leadId: req.body.leadId !== undefined ? req.body.leadId || null : undefined,
      clientId:
        req.body.clientId !== undefined ? req.body.clientId || null : undefined,
      subject:
        req.body.subject !== undefined
          ? String(req.body.subject).trim()
          : undefined,
      type: enumOrUndefined(FollowUpType, req.body.type, "follow-up type"),
      status: enumOrUndefined(
        FollowUpStatus,
        req.body.status,
        "follow-up status"
      ),
      scheduledAt:
        req.body.scheduledAt !== undefined
          ? (dateOrNull(req.body.scheduledAt) as Date)
          : undefined,
      completedAt:
        req.body.completedAt !== undefined
          ? dateOrNull(req.body.completedAt)
          : undefined,
      outcome:
        req.body.outcome !== undefined ? trimOrNull(req.body.outcome) : undefined,
      nextFollowUpAt:
        req.body.nextFollowUpAt !== undefined
          ? dateOrNull(req.body.nextFollowUpAt)
          : undefined,
      notes: req.body.notes !== undefined ? trimOrNull(req.body.notes) : undefined,
      assignedToId:
        req.body.assignedToId !== undefined
          ? req.body.assignedToId || null
          : undefined,
    },
    include: followUpInclude,
  });

  return successResponse(
    res,
    200,
    "Follow-up updated successfully",
    updatedFollowUp
  );
});

export const completeFollowUp = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const followUp = await prisma.followUp.findUnique({
    where: {
      id,
    },
  });

  if (!followUp) {
    throw new AppError("Follow-up not found", 404);
  }

  const updatedFollowUp = await prisma.followUp.update({
    where: {
      id,
    },
    data: {
      status: FollowUpStatus.COMPLETED,
      completedAt: new Date(),
      outcome: trimOrNull(req.body.outcome),
      notes: req.body.notes !== undefined ? trimOrNull(req.body.notes) : undefined,
      nextFollowUpAt: dateOrNull(req.body.nextFollowUpAt),
    },
    include: followUpInclude,
  });

  return successResponse(
    res,
    200,
    "Follow-up completed successfully",
    updatedFollowUp
  );
});

export const deleteFollowUp = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const followUp = await prisma.followUp.findUnique({
    where: {
      id,
    },
  });

  if (!followUp) {
    throw new AppError("Follow-up not found", 404);
  }

  await prisma.followUp.delete({
    where: {
      id,
    },
  });

  return successResponse(res, 200, "Follow-up deleted successfully");
});

/* =========================
   Sales Pipeline
========================= */

export const getSalesPipeline = asyncHandler(async (req, res: Response) => {
  const { stage, leadId, clientId, ownerId } = req.query;

  const pipeline = await prisma.salesPipeline.findMany({
    where: {
      stage: stage
        ? enumOrDefault(
            SalesPipelineStage,
            stage,
            SalesPipelineStage.LEAD,
            "pipeline stage"
          )
        : undefined,
      leadId: leadId ? String(leadId) : undefined,
      clientId: clientId ? String(clientId) : undefined,
      ownerId: ownerId ? String(ownerId) : undefined,
    },
    include: pipelineInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return successResponse(
    res,
    200,
    "Sales pipeline fetched successfully",
    pipeline
  );
});

export const createPipelineItem = asyncHandler(async (req, res: Response) => {
  const {
    name,
    stage,
    amount,
    probability,
    expectedCloseDate,
    closedAt,
    notes,
    leadId,
    clientId,
    ownerId,
  } = req.body;

  if (!name || !String(name).trim()) {
    throw new AppError("Pipeline item name is required", 400);
  }

  await assertLeadExists(leadId);
  await assertClientExists(clientId);
  await assertEmployeeExists(ownerId);

  const item = await prisma.salesPipeline.create({
    data: {
      name: String(name).trim(),
      stage: enumOrDefault(
        SalesPipelineStage,
        stage,
        SalesPipelineStage.LEAD,
        "pipeline stage"
      ),
      amount: numberOrNull(amount),
      probability:
        probability !== undefined && probability !== null && probability !== ""
          ? Number(probability)
          : 10,
      expectedCloseDate: dateOrNull(expectedCloseDate),
      closedAt: dateOrNull(closedAt),
      notes: trimOrNull(notes),
      leadId: leadId || null,
      clientId: clientId || null,
      ownerId: ownerId || null,
    },
    include: pipelineInclude,
  });

  return successResponse(res, 201, "Pipeline item created successfully", item);
});

export const updatePipelineItem = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const item = await prisma.salesPipeline.findUnique({
    where: {
      id,
    },
  });

  if (!item) {
    throw new AppError("Pipeline item not found", 404);
  }

  await assertLeadExists(req.body.leadId);
  await assertClientExists(req.body.clientId);
  await assertEmployeeExists(req.body.ownerId);

  const updatedItem = await prisma.salesPipeline.update({
    where: {
      id,
    },
    data: {
      name: req.body.name !== undefined ? String(req.body.name).trim() : undefined,
      stage: enumOrUndefined(
        SalesPipelineStage,
        req.body.stage,
        "pipeline stage"
      ),
      amount:
        req.body.amount !== undefined ? numberOrNull(req.body.amount) : undefined,
      probability:
        req.body.probability !== undefined ? Number(req.body.probability) : undefined,
      expectedCloseDate:
        req.body.expectedCloseDate !== undefined
          ? dateOrNull(req.body.expectedCloseDate)
          : undefined,
      closedAt:
        req.body.closedAt !== undefined ? dateOrNull(req.body.closedAt) : undefined,
      notes: req.body.notes !== undefined ? trimOrNull(req.body.notes) : undefined,
      leadId: req.body.leadId !== undefined ? req.body.leadId || null : undefined,
      clientId:
        req.body.clientId !== undefined ? req.body.clientId || null : undefined,
      ownerId:
        req.body.ownerId !== undefined ? req.body.ownerId || null : undefined,
    },
    include: pipelineInclude,
  });

  return successResponse(
    res,
    200,
    "Pipeline item updated successfully",
    updatedItem
  );
});

export const updatePipelineStage = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;
  const { stage, notes } = req.body;

  if (!stage) {
    throw new AppError("Pipeline stage is required", 400);
  }

  const finalStage = enumOrDefault(
    SalesPipelineStage,
    stage,
    SalesPipelineStage.LEAD,
    "pipeline stage"
  );

  const item = await prisma.salesPipeline.findUnique({
    where: {
      id,
    },
  });

  if (!item) {
    throw new AppError("Pipeline item not found", 404);
  }

  const updatedItem = await prisma.salesPipeline.update({
    where: {
      id,
    },
    data: {
      stage: finalStage,
      probability: finalStage === SalesPipelineStage.WON ? 100 : item.probability,
      closedAt:
        finalStage === SalesPipelineStage.WON ||
        finalStage === SalesPipelineStage.LOST
          ? new Date()
          : null,
      notes: notes !== undefined ? trimOrNull(notes) : item.notes,
    },
    include: pipelineInclude,
  });

  return successResponse(
    res,
    200,
    "Pipeline stage updated successfully",
    updatedItem
  );
});

export const deletePipelineItem = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const item = await prisma.salesPipeline.findUnique({
    where: {
      id,
    },
  });

  if (!item) {
    throw new AppError("Pipeline item not found", 404);
  }

  await prisma.salesPipeline.delete({
    where: {
      id,
    },
  });

  return successResponse(res, 200, "Pipeline item deleted successfully");
});

/* =========================
   Google Sheets Sync
========================= */

export const importSheetLeads = asyncHandler(async (req, res: Response) => {
  const result = await importLeadsFromSheet();

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: leadInclude,
  });

  try {
    getIO().emit("leads:imported", { count: result.imported });
  } catch {}

  return successResponse(res, 200, "Import completed", {
    ...result,
    recentLeads: leads,
  });
});

export const getSheetConnectionStatus = asyncHandler(
  async (req, res: Response) => {
    const status = await checkSheetStatus();

    return successResponse(res, 200, "Sheet status fetched", status);
  }
);
