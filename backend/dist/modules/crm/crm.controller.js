"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSheetConnectionStatus = exports.importSheetLeads = exports.syncLeadsToSheet = exports.deletePipelineItem = exports.updatePipelineStage = exports.updatePipelineItem = exports.createPipelineItem = exports.getSalesPipeline = exports.deleteFollowUp = exports.completeFollowUp = exports.updateFollowUp = exports.createFollowUp = exports.getFollowUps = exports.deleteClientContact = exports.updateClientContact = exports.createClientContact = exports.deleteClient = exports.updateClient = exports.createClient = exports.getClientById = exports.getClients = exports.convertLeadToClient = exports.deleteLead = exports.updateLead = exports.createLead = exports.getLeadById = exports.getLeads = exports.getCrmDashboard = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const asyncHandler_1 = require("../../utils/asyncHandler");
const AppError_1 = require("../../utils/AppError");
const response_1 = require("../../utils/response");
const socket_1 = require("../../config/socket");
const googleSheets_service_1 = require("../../services/googleSheets.service");
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
const leadInclude = {
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
const clientInclude = {
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
const followUpInclude = {
    lead: true,
    client: true,
    assignedTo: {
        select: employeeSelect,
    },
};
const pipelineInclude = {
    lead: true,
    client: true,
    owner: {
        select: employeeSelect,
    },
};
function trimOrNull(value) {
    if (value === undefined || value === null)
        return null;
    const trimmed = String(value).trim();
    return trimmed || null;
}
function numberOrNull(value) {
    if (value === undefined || value === null || value === "")
        return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
        throw new AppError_1.AppError("Numeric value is invalid", 400);
    }
    return parsed;
}
function dateOrNull(value) {
    if (!value)
        return null;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
        throw new AppError_1.AppError("Date value is invalid", 400);
    }
    return date;
}
function enumOrDefault(enumObject, value, fallback, label) {
    if (value === undefined || value === null || value === "")
        return fallback;
    const normalized = String(value);
    if (!Object.values(enumObject).includes(normalized)) {
        throw new AppError_1.AppError(`Invalid ${label}`, 400);
    }
    return normalized;
}
function enumOrUndefined(enumObject, value, label) {
    if (value === undefined)
        return undefined;
    if (value === null || value === "")
        return undefined;
    const normalized = String(value);
    if (!Object.values(enumObject).includes(normalized)) {
        throw new AppError_1.AppError(`Invalid ${label}`, 400);
    }
    return normalized;
}
async function assertEmployeeExists(employeeId) {
    if (!employeeId)
        return;
    const employee = await prisma_1.default.employee.findUnique({
        where: {
            id: employeeId,
        },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
}
async function assertLeadExists(leadId) {
    if (!leadId)
        return;
    const lead = await prisma_1.default.lead.findUnique({
        where: {
            id: leadId,
        },
    });
    if (!lead) {
        throw new AppError_1.AppError("Lead not found", 404);
    }
}
async function assertClientExists(clientId) {
    if (!clientId)
        return;
    const client = await prisma_1.default.client.findUnique({
        where: {
            id: clientId,
        },
    });
    if (!client) {
        throw new AppError_1.AppError("Client not found", 404);
    }
}
/* =========================
   CRM Dashboard
========================= */
exports.getCrmDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const [totalLeads, qualifiedLeads, wonLeads, lostLeads, activeClients, pendingFollowUps, overdueFollowUps, openPipeline, wonPipeline,] = await Promise.all([
        prisma_1.default.lead.count(),
        prisma_1.default.lead.count({ where: { status: client_1.LeadStatus.QUALIFIED } }),
        prisma_1.default.lead.count({ where: { status: client_1.LeadStatus.WON } }),
        prisma_1.default.lead.count({ where: { status: client_1.LeadStatus.LOST } }),
        prisma_1.default.client.count({ where: { status: client_1.ClientStatus.ACTIVE } }),
        prisma_1.default.followUp.count({ where: { status: client_1.FollowUpStatus.PENDING } }),
        prisma_1.default.followUp.count({
            where: {
                status: client_1.FollowUpStatus.PENDING,
                scheduledAt: {
                    lt: new Date(),
                },
            },
        }),
        prisma_1.default.salesPipeline.aggregate({
            where: {
                stage: {
                    notIn: [client_1.SalesPipelineStage.WON, client_1.SalesPipelineStage.LOST],
                },
            },
            _sum: {
                amount: true,
            },
        }),
        prisma_1.default.salesPipeline.aggregate({
            where: {
                stage: client_1.SalesPipelineStage.WON,
            },
            _sum: {
                amount: true,
            },
        }),
    ]);
    return (0, response_1.successResponse)(res, 200, "CRM dashboard fetched successfully", {
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
exports.getLeads = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { status, source, assignedToId, search } = req.query;
    const where = {
        status: status
            ? enumOrDefault(client_1.LeadStatus, status, client_1.LeadStatus.NEW, "lead status")
            : undefined,
        source: source
            ? enumOrDefault(client_1.LeadSource, source, client_1.LeadSource.OTHER, "lead source")
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
    const leads = await prisma_1.default.lead.findMany({
        where,
        include: leadInclude,
        orderBy: {
            createdAt: "desc",
        },
    });
    return (0, response_1.successResponse)(res, 200, "Leads fetched successfully", leads);
});
exports.getLeadById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const lead = await prisma_1.default.lead.findUnique({
        where: {
            id,
        },
        include: leadInclude,
    });
    if (!lead) {
        throw new AppError_1.AppError("Lead not found", 404);
    }
    return (0, response_1.successResponse)(res, 200, "Lead fetched successfully", lead);
});
exports.createLead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { companyName, contactName, email, phone, website, source, status, estimatedValue, notes, assignedToId, } = req.body;
    if (!companyName || !String(companyName).trim()) {
        throw new AppError_1.AppError("Company name is required", 400);
    }
    await assertEmployeeExists(assignedToId);
    const lead = await prisma_1.default.lead.create({
        data: {
            companyName: String(companyName).trim(),
            contactName: trimOrNull(contactName),
            email: trimOrNull(email),
            phone: trimOrNull(phone),
            website: trimOrNull(website),
            source: enumOrDefault(client_1.LeadSource, source, client_1.LeadSource.OTHER, "lead source"),
            status: enumOrDefault(client_1.LeadStatus, status, client_1.LeadStatus.NEW, "lead status"),
            estimatedValue: numberOrNull(estimatedValue),
            notes: trimOrNull(notes),
            assignedToId: assignedToId || null,
        },
        include: leadInclude,
    });
    try {
        (0, socket_1.getIO)().emit("lead:created", lead);
        (0, googleSheets_service_1.appendLeadToSheet)({
            id: lead.id,
            companyName: lead.companyName,
            contactName: lead.contactName,
            email: lead.email,
            phone: lead.phone,
            source: lead.source,
            status: lead.status,
            estimatedValue: lead.estimatedValue,
            notes: lead.notes,
            createdAt: lead.createdAt,
        });
    }
    catch { }
    return (0, response_1.successResponse)(res, 201, "Lead created successfully", lead);
});
exports.updateLead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const lead = await prisma_1.default.lead.findUnique({
        where: {
            id,
        },
    });
    if (!lead) {
        throw new AppError_1.AppError("Lead not found", 404);
    }
    await assertEmployeeExists(req.body.assignedToId);
    const updatedLead = await prisma_1.default.lead.update({
        where: {
            id,
        },
        data: {
            companyName: req.body.companyName !== undefined
                ? String(req.body.companyName).trim()
                : undefined,
            contactName: req.body.contactName !== undefined
                ? trimOrNull(req.body.contactName)
                : undefined,
            email: req.body.email !== undefined ? trimOrNull(req.body.email) : undefined,
            phone: req.body.phone !== undefined ? trimOrNull(req.body.phone) : undefined,
            website: req.body.website !== undefined ? trimOrNull(req.body.website) : undefined,
            source: enumOrUndefined(client_1.LeadSource, req.body.source, "lead source"),
            status: enumOrUndefined(client_1.LeadStatus, req.body.status, "lead status"),
            estimatedValue: req.body.estimatedValue !== undefined
                ? numberOrNull(req.body.estimatedValue)
                : undefined,
            notes: req.body.notes !== undefined ? trimOrNull(req.body.notes) : undefined,
            assignedToId: req.body.assignedToId !== undefined
                ? req.body.assignedToId || null
                : undefined,
        },
        include: leadInclude,
    });
    try {
        (0, socket_1.getIO)().emit("lead:updated", updatedLead);
        if (req.body.status || req.body.notes !== undefined) {
            (0, googleSheets_service_1.updateLeadInSheet)(updatedLead.id, updatedLead.status, req.body.notes !== undefined ? updatedLead.notes : undefined);
        }
    }
    catch { }
    return (0, response_1.successResponse)(res, 200, "Lead updated successfully", updatedLead);
});
exports.deleteLead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const lead = await prisma_1.default.lead.findUnique({
        where: {
            id,
        },
    });
    if (!lead) {
        throw new AppError_1.AppError("Lead not found", 404);
    }
    await prisma_1.default.lead.delete({
        where: {
            id,
        },
    });
    try {
        (0, socket_1.getIO)().emit("lead:deleted", { id });
    }
    catch { }
    return (0, response_1.successResponse)(res, 200, "Lead deleted successfully");
});
exports.convertLeadToClient = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const lead = await prisma_1.default.lead.findUnique({
        where: {
            id,
        },
    });
    if (!lead) {
        throw new AppError_1.AppError("Lead not found", 404);
    }
    if (lead.convertedClientId) {
        throw new AppError_1.AppError("Lead is already converted to a client", 409);
    }
    await assertEmployeeExists(req.body.accountOwnerId || lead.assignedToId);
    const client = await prisma_1.default.$transaction(async (tx) => {
        const createdClient = await tx.client.create({
            data: {
                name: String(req.body.name || lead.companyName).trim(),
                status: client_1.ClientStatus.ACTIVE,
                source: lead.source,
                industry: trimOrNull(req.body.industry),
                website: trimOrNull(req.body.website) || lead.website,
                email: trimOrNull(req.body.email) || lead.email,
                phone: trimOrNull(req.body.phone) || lead.phone,
                address: trimOrNull(req.body.address),
                notes: trimOrNull(req.body.notes) || lead.notes,
                retainerValue: numberOrNull(req.body.retainerValue),
                contractValue: numberOrNull(req.body.contractValue) || lead.estimatedValue,
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
                status: client_1.LeadStatus.WON,
                convertedClientId: createdClient.id,
                convertedAt: new Date(),
            },
        });
        await tx.salesPipeline.create({
            data: {
                name: `${lead.companyName} Conversion`,
                stage: client_1.SalesPipelineStage.WON,
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
    return (0, response_1.successResponse)(res, 201, "Lead converted to client successfully", client);
});
/* =========================
   Clients
========================= */
exports.getClients = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { status, source, accountOwnerId, search } = req.query;
    const clients = await prisma_1.default.client.findMany({
        where: {
            status: status
                ? enumOrDefault(client_1.ClientStatus, status, client_1.ClientStatus.PROSPECT, "client status")
                : undefined,
            source: source
                ? enumOrDefault(client_1.LeadSource, source, client_1.LeadSource.OTHER, "lead source")
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
    return (0, response_1.successResponse)(res, 200, "Clients fetched successfully", clients);
});
exports.getClientById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const client = await prisma_1.default.client.findUnique({
        where: {
            id,
        },
        include: clientInclude,
    });
    if (!client) {
        throw new AppError_1.AppError("Client not found", 404);
    }
    return (0, response_1.successResponse)(res, 200, "Client fetched successfully", client);
});
exports.createClient = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, status, source, industry, website, email, phone, address, notes, retainerValue, contractValue, onboardedAt, accountOwnerId, } = req.body;
    if (!name || !String(name).trim()) {
        throw new AppError_1.AppError("Client name is required", 400);
    }
    await assertEmployeeExists(accountOwnerId);
    const client = await prisma_1.default.client.create({
        data: {
            name: String(name).trim(),
            status: enumOrDefault(client_1.ClientStatus, status, client_1.ClientStatus.PROSPECT, "client status"),
            source: enumOrDefault(client_1.LeadSource, source, client_1.LeadSource.OTHER, "lead source"),
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
    return (0, response_1.successResponse)(res, 201, "Client created successfully", client);
});
exports.updateClient = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const client = await prisma_1.default.client.findUnique({
        where: {
            id,
        },
    });
    if (!client) {
        throw new AppError_1.AppError("Client not found", 404);
    }
    await assertEmployeeExists(req.body.accountOwnerId);
    const updatedClient = await prisma_1.default.client.update({
        where: {
            id,
        },
        data: {
            name: req.body.name !== undefined ? String(req.body.name).trim() : undefined,
            status: enumOrUndefined(client_1.ClientStatus, req.body.status, "client status"),
            source: enumOrUndefined(client_1.LeadSource, req.body.source, "lead source"),
            industry: req.body.industry !== undefined ? trimOrNull(req.body.industry) : undefined,
            website: req.body.website !== undefined ? trimOrNull(req.body.website) : undefined,
            email: req.body.email !== undefined ? trimOrNull(req.body.email) : undefined,
            phone: req.body.phone !== undefined ? trimOrNull(req.body.phone) : undefined,
            address: req.body.address !== undefined ? trimOrNull(req.body.address) : undefined,
            notes: req.body.notes !== undefined ? trimOrNull(req.body.notes) : undefined,
            retainerValue: req.body.retainerValue !== undefined
                ? numberOrNull(req.body.retainerValue)
                : undefined,
            contractValue: req.body.contractValue !== undefined
                ? numberOrNull(req.body.contractValue)
                : undefined,
            onboardedAt: req.body.onboardedAt !== undefined
                ? dateOrNull(req.body.onboardedAt)
                : undefined,
            accountOwnerId: req.body.accountOwnerId !== undefined
                ? req.body.accountOwnerId || null
                : undefined,
        },
        include: clientInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Client updated successfully", updatedClient);
});
exports.deleteClient = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const client = await prisma_1.default.client.findUnique({
        where: {
            id,
        },
    });
    if (!client) {
        throw new AppError_1.AppError("Client not found", 404);
    }
    await prisma_1.default.$transaction(async (tx) => {
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
    return (0, response_1.successResponse)(res, 200, "Client deleted successfully");
});
/* =========================
   Client Contacts
========================= */
exports.createClientContact = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { clientId } = req.params;
    const { name, designation, email, phone, isPrimary, notes } = req.body;
    if (!name || !String(name).trim()) {
        throw new AppError_1.AppError("Contact name is required", 400);
    }
    await assertClientExists(clientId);
    const contact = await prisma_1.default.$transaction(async (tx) => {
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
    return (0, response_1.successResponse)(res, 201, "Client contact created successfully", contact);
});
exports.updateClientContact = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { contactId } = req.params;
    const contact = await prisma_1.default.clientContact.findUnique({
        where: {
            id: contactId,
        },
    });
    if (!contact) {
        throw new AppError_1.AppError("Client contact not found", 404);
    }
    const updatedContact = await prisma_1.default.$transaction(async (tx) => {
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
                name: req.body.name !== undefined ? String(req.body.name).trim() : undefined,
                designation: req.body.designation !== undefined
                    ? trimOrNull(req.body.designation)
                    : undefined,
                email: req.body.email !== undefined ? trimOrNull(req.body.email) : undefined,
                phone: req.body.phone !== undefined ? trimOrNull(req.body.phone) : undefined,
                isPrimary: req.body.isPrimary !== undefined ? Boolean(req.body.isPrimary) : undefined,
                notes: req.body.notes !== undefined ? trimOrNull(req.body.notes) : undefined,
            },
        });
    });
    return (0, response_1.successResponse)(res, 200, "Client contact updated successfully", updatedContact);
});
exports.deleteClientContact = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { contactId } = req.params;
    const contact = await prisma_1.default.clientContact.findUnique({
        where: {
            id: contactId,
        },
    });
    if (!contact) {
        throw new AppError_1.AppError("Client contact not found", 404);
    }
    await prisma_1.default.clientContact.delete({
        where: {
            id: contactId,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Client contact deleted successfully");
});
/* =========================
   Follow Ups
========================= */
exports.getFollowUps = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { status, leadId, clientId, assignedToId } = req.query;
    const followUps = await prisma_1.default.followUp.findMany({
        where: {
            status: status
                ? enumOrDefault(client_1.FollowUpStatus, status, client_1.FollowUpStatus.PENDING, "follow-up status")
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
    return (0, response_1.successResponse)(res, 200, "Follow-ups fetched successfully", followUps);
});
exports.createFollowUp = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { leadId, clientId, subject, type, status, scheduledAt, completedAt, outcome, nextFollowUpAt, notes, assignedToId, } = req.body;
    if (!subject || !String(subject).trim()) {
        throw new AppError_1.AppError("Follow-up subject is required", 400);
    }
    if (!scheduledAt) {
        throw new AppError_1.AppError("Follow-up scheduled date is required", 400);
    }
    if (!leadId && !clientId) {
        throw new AppError_1.AppError("Follow-up must be linked to a lead or client", 400);
    }
    await assertLeadExists(leadId);
    await assertClientExists(clientId);
    await assertEmployeeExists(assignedToId);
    const followUp = await prisma_1.default.followUp.create({
        data: {
            leadId: leadId || null,
            clientId: clientId || null,
            subject: String(subject).trim(),
            type: enumOrDefault(client_1.FollowUpType, type, client_1.FollowUpType.CALL, "follow-up type"),
            status: enumOrDefault(client_1.FollowUpStatus, status, client_1.FollowUpStatus.PENDING, "follow-up status"),
            scheduledAt: dateOrNull(scheduledAt),
            completedAt: dateOrNull(completedAt),
            outcome: trimOrNull(outcome),
            nextFollowUpAt: dateOrNull(nextFollowUpAt),
            notes: trimOrNull(notes),
            assignedToId: assignedToId || null,
        },
        include: followUpInclude,
    });
    return (0, response_1.successResponse)(res, 201, "Follow-up created successfully", followUp);
});
exports.updateFollowUp = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const followUp = await prisma_1.default.followUp.findUnique({
        where: {
            id,
        },
    });
    if (!followUp) {
        throw new AppError_1.AppError("Follow-up not found", 404);
    }
    await assertLeadExists(req.body.leadId);
    await assertClientExists(req.body.clientId);
    await assertEmployeeExists(req.body.assignedToId);
    const updatedFollowUp = await prisma_1.default.followUp.update({
        where: {
            id,
        },
        data: {
            leadId: req.body.leadId !== undefined ? req.body.leadId || null : undefined,
            clientId: req.body.clientId !== undefined ? req.body.clientId || null : undefined,
            subject: req.body.subject !== undefined
                ? String(req.body.subject).trim()
                : undefined,
            type: enumOrUndefined(client_1.FollowUpType, req.body.type, "follow-up type"),
            status: enumOrUndefined(client_1.FollowUpStatus, req.body.status, "follow-up status"),
            scheduledAt: req.body.scheduledAt !== undefined
                ? dateOrNull(req.body.scheduledAt)
                : undefined,
            completedAt: req.body.completedAt !== undefined
                ? dateOrNull(req.body.completedAt)
                : undefined,
            outcome: req.body.outcome !== undefined ? trimOrNull(req.body.outcome) : undefined,
            nextFollowUpAt: req.body.nextFollowUpAt !== undefined
                ? dateOrNull(req.body.nextFollowUpAt)
                : undefined,
            notes: req.body.notes !== undefined ? trimOrNull(req.body.notes) : undefined,
            assignedToId: req.body.assignedToId !== undefined
                ? req.body.assignedToId || null
                : undefined,
        },
        include: followUpInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Follow-up updated successfully", updatedFollowUp);
});
exports.completeFollowUp = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const followUp = await prisma_1.default.followUp.findUnique({
        where: {
            id,
        },
    });
    if (!followUp) {
        throw new AppError_1.AppError("Follow-up not found", 404);
    }
    const updatedFollowUp = await prisma_1.default.followUp.update({
        where: {
            id,
        },
        data: {
            status: client_1.FollowUpStatus.COMPLETED,
            completedAt: new Date(),
            outcome: trimOrNull(req.body.outcome),
            notes: req.body.notes !== undefined ? trimOrNull(req.body.notes) : undefined,
            nextFollowUpAt: dateOrNull(req.body.nextFollowUpAt),
        },
        include: followUpInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Follow-up completed successfully", updatedFollowUp);
});
exports.deleteFollowUp = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const followUp = await prisma_1.default.followUp.findUnique({
        where: {
            id,
        },
    });
    if (!followUp) {
        throw new AppError_1.AppError("Follow-up not found", 404);
    }
    await prisma_1.default.followUp.delete({
        where: {
            id,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Follow-up deleted successfully");
});
/* =========================
   Sales Pipeline
========================= */
exports.getSalesPipeline = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { stage, leadId, clientId, ownerId } = req.query;
    const pipeline = await prisma_1.default.salesPipeline.findMany({
        where: {
            stage: stage
                ? enumOrDefault(client_1.SalesPipelineStage, stage, client_1.SalesPipelineStage.LEAD, "pipeline stage")
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
    return (0, response_1.successResponse)(res, 200, "Sales pipeline fetched successfully", pipeline);
});
exports.createPipelineItem = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, stage, amount, probability, expectedCloseDate, closedAt, notes, leadId, clientId, ownerId, } = req.body;
    if (!name || !String(name).trim()) {
        throw new AppError_1.AppError("Pipeline item name is required", 400);
    }
    await assertLeadExists(leadId);
    await assertClientExists(clientId);
    await assertEmployeeExists(ownerId);
    const item = await prisma_1.default.salesPipeline.create({
        data: {
            name: String(name).trim(),
            stage: enumOrDefault(client_1.SalesPipelineStage, stage, client_1.SalesPipelineStage.LEAD, "pipeline stage"),
            amount: numberOrNull(amount),
            probability: probability !== undefined && probability !== null && probability !== ""
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
    return (0, response_1.successResponse)(res, 201, "Pipeline item created successfully", item);
});
exports.updatePipelineItem = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const item = await prisma_1.default.salesPipeline.findUnique({
        where: {
            id,
        },
    });
    if (!item) {
        throw new AppError_1.AppError("Pipeline item not found", 404);
    }
    await assertLeadExists(req.body.leadId);
    await assertClientExists(req.body.clientId);
    await assertEmployeeExists(req.body.ownerId);
    const updatedItem = await prisma_1.default.salesPipeline.update({
        where: {
            id,
        },
        data: {
            name: req.body.name !== undefined ? String(req.body.name).trim() : undefined,
            stage: enumOrUndefined(client_1.SalesPipelineStage, req.body.stage, "pipeline stage"),
            amount: req.body.amount !== undefined ? numberOrNull(req.body.amount) : undefined,
            probability: req.body.probability !== undefined ? Number(req.body.probability) : undefined,
            expectedCloseDate: req.body.expectedCloseDate !== undefined
                ? dateOrNull(req.body.expectedCloseDate)
                : undefined,
            closedAt: req.body.closedAt !== undefined ? dateOrNull(req.body.closedAt) : undefined,
            notes: req.body.notes !== undefined ? trimOrNull(req.body.notes) : undefined,
            leadId: req.body.leadId !== undefined ? req.body.leadId || null : undefined,
            clientId: req.body.clientId !== undefined ? req.body.clientId || null : undefined,
            ownerId: req.body.ownerId !== undefined ? req.body.ownerId || null : undefined,
        },
        include: pipelineInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Pipeline item updated successfully", updatedItem);
});
exports.updatePipelineStage = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { stage, notes } = req.body;
    if (!stage) {
        throw new AppError_1.AppError("Pipeline stage is required", 400);
    }
    const finalStage = enumOrDefault(client_1.SalesPipelineStage, stage, client_1.SalesPipelineStage.LEAD, "pipeline stage");
    const item = await prisma_1.default.salesPipeline.findUnique({
        where: {
            id,
        },
    });
    if (!item) {
        throw new AppError_1.AppError("Pipeline item not found", 404);
    }
    const updatedItem = await prisma_1.default.salesPipeline.update({
        where: {
            id,
        },
        data: {
            stage: finalStage,
            probability: finalStage === client_1.SalesPipelineStage.WON ? 100 : item.probability,
            closedAt: finalStage === client_1.SalesPipelineStage.WON ||
                finalStage === client_1.SalesPipelineStage.LOST
                ? new Date()
                : null,
            notes: notes !== undefined ? trimOrNull(notes) : item.notes,
        },
        include: pipelineInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Pipeline stage updated successfully", updatedItem);
});
exports.deletePipelineItem = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const item = await prisma_1.default.salesPipeline.findUnique({
        where: {
            id,
        },
    });
    if (!item) {
        throw new AppError_1.AppError("Pipeline item not found", 404);
    }
    await prisma_1.default.salesPipeline.delete({
        where: {
            id,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Pipeline item deleted successfully");
});
/* =========================
   Google Sheets Sync
========================= */
exports.syncLeadsToSheet = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const leads = await prisma_1.default.lead.findMany({
        orderBy: { createdAt: "desc" },
    });
    let synced = 0;
    let failed = 0;
    for (const lead of leads) {
        try {
            const ok = await (0, googleSheets_service_1.appendLeadToSheet)({
                id: lead.id,
                companyName: lead.companyName,
                contactName: lead.contactName,
                email: lead.email,
                phone: lead.phone,
                source: lead.source,
                status: lead.status,
                estimatedValue: lead.estimatedValue,
                notes: lead.notes,
                createdAt: lead.createdAt,
            });
            if (ok)
                synced++;
            else
                failed++;
        }
        catch {
            failed++;
        }
    }
    return (0, response_1.successResponse)(res, 200, "Sync completed", {
        total: leads.length,
        synced,
        failed,
    });
});
exports.importSheetLeads = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const result = await (0, googleSheets_service_1.importLeadsFromSheet)();
    const leads = await prisma_1.default.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: leadInclude,
    });
    try {
        (0, socket_1.getIO)().emit("leads:imported", { count: result.imported });
    }
    catch { }
    return (0, response_1.successResponse)(res, 200, "Import completed", {
        ...result,
        recentLeads: leads,
    });
});
exports.getSheetConnectionStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const status = await (0, googleSheets_service_1.getSheetStatus)();
    return (0, response_1.successResponse)(res, 200, "Sheet status fetched", status);
});
