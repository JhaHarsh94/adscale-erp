import { randomBytes } from "crypto";
import { TicketPriority, TicketSource, TicketStatus, type Prisma } from "@prisma/client";
import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";

const clean = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str || null;
};
const enumValue = <T extends Record<string, string>>(values: T, value: unknown, fallback: T[keyof T]) =>
  Object.values(values).includes(String(value)) ? String(value) as T[keyof T] : fallback;
const ticketNumber = () => `TKT-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;

const employeeSelect = { id: true, employeeCode: true, user: { select: { name: true, email: true } } };

const ticketInclude: Prisma.TicketInclude = {
  category: true,
  client: true,
  project: { select: { id: true, name: true, projectCode: true } },
  assignedTo: { select: employeeSelect },
  createdBy: { select: { id: true, name: true, email: true } },
  comments: { include: { author: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } },
  statusLogs: { include: { changedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
  slaLogs: { orderBy: { createdAt: "desc" } },
};

async function ticket(id: string) {
  const result = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
  if (!result) throw new AppError("Ticket not found", 404);
  return result;
}

/* Categories */
export const categoriesList = asyncHandler(async (_req, res) => {
  const categories = await prisma.ticketCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return successResponse(res, 200, "Ticket categories fetched", categories);
});

export const categoriesCreate = asyncHandler(async (req, res) => {
  if (!clean(req.body.name)) throw new AppError("Category name is required", 400);
  const category = await prisma.ticketCategory.create({
    data: { name: clean(req.body.name)!, description: clean(req.body.description), defaultSlaHours: Number(req.body.defaultSlaHours || 24) },
  });
  return successResponse(res, 201, "Ticket category created", category);
});

export const categoriesUpdate = asyncHandler(async (req, res) => {
  const current = await prisma.ticketCategory.findUnique({ where: { id: req.params.id } });
  if (!current) throw new AppError("Category not found", 404);
  const category = await prisma.ticketCategory.update({
    where: { id: req.params.id },
    data: { name: clean(req.body.name) || undefined, description: req.body.description === undefined ? undefined : clean(req.body.description), defaultSlaHours: req.body.defaultSlaHours === undefined ? undefined : Number(req.body.defaultSlaHours) },
  });
  return successResponse(res, 200, "Ticket category updated", category);
});

export const categoriesDelete = asyncHandler(async (req, res) => {
  const current = await prisma.ticketCategory.findUnique({ where: { id: req.params.id } });
  if (!current) throw new AppError("Category not found", 404);
  await prisma.ticketCategory.update({ where: { id: req.params.id }, data: { isActive: false } });
  return successResponse(res, 200, "Ticket category deactivated");
});

/* Dashboard */
export const ticketsDashboard = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
  const where: Prisma.TicketWhereInput = isAgent ? {} : { assignedTo: { user: { id: user?.id } } };
  const [total, open, assigned, inProgress, waitingOnClient, resolved, closed, escalated] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { ...where, status: "OPEN" } }),
    prisma.ticket.count({ where: { ...where, status: "ASSIGNED" } }),
    prisma.ticket.count({ where: { ...where, status: "IN_PROGRESS" } }),
    prisma.ticket.count({ where: { ...where, status: "WAITING_ON_CLIENT" } }),
    prisma.ticket.count({ where: { ...where, status: "RESOLVED" } }),
    prisma.ticket.count({ where: { ...where, status: "CLOSED" } }),
    prisma.ticket.count({ where: { ...where, status: "ESCALATED" } }),
  ]);
  return successResponse(res, 200, "Ticket dashboard fetched", { total, open, assigned, inProgress, waitingOnClient, resolved, closed, escalated });
});

/* CRUD */
export const ticketsList = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
  const where: Prisma.TicketWhereInput = {};
  if (!isAgent && user) where.assignedTo = { user: { id: user.id } };
  if (req.query.status) where.status = enumValue(TicketStatus, req.query.status, TicketStatus.OPEN);
  if (req.query.priority) where.priority = enumValue(TicketPriority, req.query.priority, TicketPriority.MEDIUM);
  if (req.query.categoryId) where.categoryId = String(req.query.categoryId);
  if (req.query.clientId) where.clientId = String(req.query.clientId);
  if (req.query.source) where.source = enumValue(TicketSource, req.query.source, TicketSource.INTERNAL);
  if (req.query.assignedToId) where.assignedToId = String(req.query.assignedToId);
  if (req.query.search) {
    where.OR = [
      { title: { contains: String(req.query.search), mode: "insensitive" } },
      { ticketNumber: { contains: String(req.query.search), mode: "insensitive" } },
    ];
  }
  const tickets = await prisma.ticket.findMany({ where, include: ticketInclude, orderBy: { createdAt: "desc" } });
  return successResponse(res, 200, "Tickets fetched", tickets);
});

export const ticketsGetOne = asyncHandler(async (req, res) => {
  return successResponse(res, 200, "Ticket fetched", await ticket(req.params.id));
});

export const ticketsCreate = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  if (!clean(req.body.title) || !clean(req.body.description)) throw new AppError("Title and description are required", 400);
  const data: Prisma.TicketCreateInput = {
    ticketNumber: ticketNumber(),
    title: clean(req.body.title)!,
    description: clean(req.body.description)!,
    priority: enumValue(TicketPriority, req.body.priority, TicketPriority.MEDIUM),
    source: enumValue(TicketSource, req.body.source, TicketSource.INTERNAL),
    category: req.body.categoryId ? { connect: { id: req.body.categoryId } } : undefined,
    client: req.body.clientId ? { connect: { id: req.body.clientId } } : undefined,
    project: req.body.projectId ? { connect: { id: req.body.projectId } } : undefined,
    assignedTo: req.body.assignedToId ? { connect: { id: req.body.assignedToId } } : undefined,
    createdBy: { connect: { id: user?.id } },
    dueAt: req.body.dueAt ? new Date(req.body.dueAt) : undefined,
    firstResponseDueAt: req.body.firstResponseDueAt ? new Date(req.body.firstResponseDueAt) : undefined,
    resolutionDueAt: req.body.resolutionDueAt ? new Date(req.body.resolutionDueAt) : undefined,
    statusLogs: { create: { toStatus: "OPEN", changedById: user?.id, remarks: "Ticket created" } },
  };
  const result = await prisma.ticket.create({ data, include: ticketInclude });
  return successResponse(res, 201, "Ticket created", result);
});

export const ticketsUpdate = asyncHandler(async (req, res) => {
  const current = await ticket(req.params.id);
  const data: Prisma.TicketUpdateInput = {};
  if (clean(req.body.title)) data.title = clean(req.body.title)!;
  if (req.body.description !== undefined) data.description = clean(req.body.description) || undefined;
  if (req.body.priority) data.priority = enumValue(TicketPriority, req.body.priority, current.priority);
  if (req.body.source) data.source = enumValue(TicketSource, req.body.source, current.source);
  if (req.body.categoryId !== undefined) data.category = req.body.categoryId ? { connect: { id: req.body.categoryId } } : { disconnect: true };
  if (req.body.clientId !== undefined) data.client = req.body.clientId ? { connect: { id: req.body.clientId } } : { disconnect: true };
  if (req.body.projectId !== undefined) data.project = req.body.projectId ? { connect: { id: req.body.projectId } } : { disconnect: true };
  if (req.body.assignedToId !== undefined) data.assignedTo = req.body.assignedToId ? { connect: { id: req.body.assignedToId } } : { disconnect: true };
  if (req.body.dueAt !== undefined) data.dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
  if (req.body.firstResponseDueAt !== undefined) data.firstResponseDueAt = req.body.firstResponseDueAt ? new Date(req.body.firstResponseDueAt) : null;
  if (req.body.resolutionDueAt !== undefined) data.resolutionDueAt = req.body.resolutionDueAt ? new Date(req.body.resolutionDueAt) : null;
  const result = await prisma.ticket.update({ where: { id: req.params.id }, data, include: ticketInclude });
  return successResponse(res, 200, "Ticket updated", result);
});

export const ticketsChangeStatus = asyncHandler(async (req, res) => {
  const current = await ticket(req.params.id);
  const user = (req as AuthRequest).user;
  const newStatus = enumValue(TicketStatus, req.body.status, current.status);
  if (newStatus === current.status) return successResponse(res, 200, "No status change", current);
  const updateData: Record<string, unknown> = {
    status: newStatus,
    statusLogs: { create: { fromStatus: current.status, toStatus: newStatus, changedById: user?.id, remarks: clean(req.body.remarks) } },
  };
  if (newStatus === "RESOLVED") updateData.resolvedAt = new Date();
  if (newStatus === "CLOSED") updateData.closedAt = new Date();
  if (newStatus === "ASSIGNED" && req.body.assignedToId) {
    updateData.assignedTo = { connect: { id: req.body.assignedToId } };
  }
  const result = await prisma.ticket.update({ where: { id: req.params.id }, data: updateData as Prisma.TicketUpdateInput, include: ticketInclude });
  return successResponse(res, 200, "Ticket status updated", result);
});

export const ticketsAssign = asyncHandler(async (req, res) => {
  const current = await ticket(req.params.id);
  if (!req.body.employeeId) throw new AppError("Employee ID is required", 400);
  const employee = await prisma.employee.findUnique({ where: { id: req.body.employeeId } });
  if (!employee) throw new AppError("Employee not found", 404);
  const result = await prisma.ticket.update({
    where: { id: req.params.id },
    data: {
      assignedTo: { connect: { id: req.body.employeeId } },
      status: current.status === "OPEN" ? "ASSIGNED" : current.status,
      statusLogs: { create: { fromStatus: current.status, toStatus: current.status === "OPEN" ? "ASSIGNED" : current.status, changedById: (req as AuthRequest).user?.id, remarks: `Assigned to ${employee.employeeCode}` } },
    },
    include: ticketInclude,
  });
  return successResponse(res, 200, "Ticket assigned", result);
});

/* Comments */
export const ticketCommentsList = asyncHandler(async (req, res) => {
  await ticket(req.params.id);
  const comments = await prisma.ticketComment.findMany({
    where: { ticketId: req.params.id },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return successResponse(res, 200, "Ticket comments fetched", comments);
});

export const ticketCommentsCreate = asyncHandler(async (req, res) => {
  await ticket(req.params.id);
  if (!clean(req.body.body)) throw new AppError("Comment body is required", 400);
  const user = (req as AuthRequest).user;
  const comment = await prisma.ticketComment.create({
    data: { ticketId: req.params.id, authorId: user?.id, body: clean(req.body.body)!, isInternal: req.body.isInternal === true },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  return successResponse(res, 201, "Comment added", comment);
});

/* SLA Logs */
export const ticketsSlaEvent = asyncHandler(async (req, res) => {
  await ticket(req.params.id);
  const log = await prisma.ticketSlaLog.create({
    data: { ticketId: req.params.id, event: req.body.event, notes: clean(req.body.notes) },
  });
  return successResponse(res, 201, "SLA event logged", log);
});
