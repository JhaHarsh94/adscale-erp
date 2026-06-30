"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketsSlaEvent = exports.ticketCommentsCreate = exports.ticketCommentsList = exports.ticketsAssign = exports.ticketsChangeStatus = exports.ticketsUpdate = exports.ticketsCreate = exports.ticketsGetOne = exports.ticketsList = exports.ticketsDashboard = exports.categoriesDelete = exports.categoriesUpdate = exports.categoriesCreate = exports.categoriesList = void 0;
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const AppError_1 = require("../../utils/AppError");
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const clean = (value) => {
    if (value === null || value === undefined)
        return null;
    const str = String(value).trim();
    return str || null;
};
const enumValue = (values, value, fallback) => Object.values(values).includes(String(value)) ? String(value) : fallback;
const ticketNumber = () => `TKT-${new Date().getFullYear()}-${(0, crypto_1.randomBytes)(3).toString("hex").toUpperCase()}`;
const employeeSelect = { id: true, employeeCode: true, user: { select: { name: true, email: true } } };
const ticketInclude = {
    category: true,
    client: true,
    project: { select: { id: true, name: true, projectCode: true } },
    assignedTo: { select: employeeSelect },
    createdBy: { select: { id: true, name: true, email: true } },
    comments: { include: { author: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } },
    statusLogs: { include: { changedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    slaLogs: { orderBy: { createdAt: "desc" } },
};
async function ticket(id) {
    const result = await prisma_1.default.ticket.findUnique({ where: { id }, include: ticketInclude });
    if (!result)
        throw new AppError_1.AppError("Ticket not found", 404);
    return result;
}
/* Categories */
exports.categoriesList = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const categories = await prisma_1.default.ticketCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    return (0, response_1.successResponse)(res, 200, "Ticket categories fetched", categories);
});
exports.categoriesCreate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!clean(req.body.name))
        throw new AppError_1.AppError("Category name is required", 400);
    const category = await prisma_1.default.ticketCategory.create({
        data: { name: clean(req.body.name), description: clean(req.body.description), defaultSlaHours: Number(req.body.defaultSlaHours || 24) },
    });
    return (0, response_1.successResponse)(res, 201, "Ticket category created", category);
});
exports.categoriesUpdate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await prisma_1.default.ticketCategory.findUnique({ where: { id: req.params.id } });
    if (!current)
        throw new AppError_1.AppError("Category not found", 404);
    const category = await prisma_1.default.ticketCategory.update({
        where: { id: req.params.id },
        data: { name: clean(req.body.name) || undefined, description: req.body.description === undefined ? undefined : clean(req.body.description), defaultSlaHours: req.body.defaultSlaHours === undefined ? undefined : Number(req.body.defaultSlaHours) },
    });
    return (0, response_1.successResponse)(res, 200, "Ticket category updated", category);
});
exports.categoriesDelete = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await prisma_1.default.ticketCategory.findUnique({ where: { id: req.params.id } });
    if (!current)
        throw new AppError_1.AppError("Category not found", 404);
    await prisma_1.default.ticketCategory.update({ where: { id: req.params.id }, data: { isActive: false } });
    return (0, response_1.successResponse)(res, 200, "Ticket category deactivated");
});
/* Dashboard */
exports.ticketsDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
    const where = isAgent ? {} : { assignedTo: { user: { id: user?.id } } };
    const [total, open, assigned, inProgress, waitingOnClient, resolved, closed, escalated] = await Promise.all([
        prisma_1.default.ticket.count({ where }),
        prisma_1.default.ticket.count({ where: { ...where, status: "OPEN" } }),
        prisma_1.default.ticket.count({ where: { ...where, status: "ASSIGNED" } }),
        prisma_1.default.ticket.count({ where: { ...where, status: "IN_PROGRESS" } }),
        prisma_1.default.ticket.count({ where: { ...where, status: "WAITING_ON_CLIENT" } }),
        prisma_1.default.ticket.count({ where: { ...where, status: "RESOLVED" } }),
        prisma_1.default.ticket.count({ where: { ...where, status: "CLOSED" } }),
        prisma_1.default.ticket.count({ where: { ...where, status: "ESCALATED" } }),
    ]);
    return (0, response_1.successResponse)(res, 200, "Ticket dashboard fetched", { total, open, assigned, inProgress, waitingOnClient, resolved, closed, escalated });
});
/* CRUD */
exports.ticketsList = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
    const where = {};
    if (!isAgent && user)
        where.assignedTo = { user: { id: user.id } };
    if (req.query.status)
        where.status = enumValue(client_1.TicketStatus, req.query.status, client_1.TicketStatus.OPEN);
    if (req.query.priority)
        where.priority = enumValue(client_1.TicketPriority, req.query.priority, client_1.TicketPriority.MEDIUM);
    if (req.query.categoryId)
        where.categoryId = String(req.query.categoryId);
    if (req.query.clientId)
        where.clientId = String(req.query.clientId);
    if (req.query.source)
        where.source = enumValue(client_1.TicketSource, req.query.source, client_1.TicketSource.INTERNAL);
    if (req.query.assignedToId)
        where.assignedToId = String(req.query.assignedToId);
    if (req.query.search) {
        where.OR = [
            { title: { contains: String(req.query.search), mode: "insensitive" } },
            { ticketNumber: { contains: String(req.query.search), mode: "insensitive" } },
        ];
    }
    const tickets = await prisma_1.default.ticket.findMany({ where, include: ticketInclude, orderBy: { createdAt: "desc" } });
    return (0, response_1.successResponse)(res, 200, "Tickets fetched", tickets);
});
exports.ticketsGetOne = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    return (0, response_1.successResponse)(res, 200, "Ticket fetched", await ticket(req.params.id));
});
exports.ticketsCreate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    if (!clean(req.body.title) || !clean(req.body.description))
        throw new AppError_1.AppError("Title and description are required", 400);
    const data = {
        ticketNumber: ticketNumber(),
        title: clean(req.body.title),
        description: clean(req.body.description),
        priority: enumValue(client_1.TicketPriority, req.body.priority, client_1.TicketPriority.MEDIUM),
        source: enumValue(client_1.TicketSource, req.body.source, client_1.TicketSource.INTERNAL),
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
    const result = await prisma_1.default.ticket.create({ data, include: ticketInclude });
    return (0, response_1.successResponse)(res, 201, "Ticket created", result);
});
exports.ticketsUpdate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await ticket(req.params.id);
    const data = {};
    if (clean(req.body.title))
        data.title = clean(req.body.title);
    if (req.body.description !== undefined)
        data.description = clean(req.body.description) || undefined;
    if (req.body.priority)
        data.priority = enumValue(client_1.TicketPriority, req.body.priority, current.priority);
    if (req.body.source)
        data.source = enumValue(client_1.TicketSource, req.body.source, current.source);
    if (req.body.categoryId !== undefined)
        data.category = req.body.categoryId ? { connect: { id: req.body.categoryId } } : { disconnect: true };
    if (req.body.clientId !== undefined)
        data.client = req.body.clientId ? { connect: { id: req.body.clientId } } : { disconnect: true };
    if (req.body.projectId !== undefined)
        data.project = req.body.projectId ? { connect: { id: req.body.projectId } } : { disconnect: true };
    if (req.body.assignedToId !== undefined)
        data.assignedTo = req.body.assignedToId ? { connect: { id: req.body.assignedToId } } : { disconnect: true };
    if (req.body.dueAt !== undefined)
        data.dueAt = req.body.dueAt ? new Date(req.body.dueAt) : null;
    if (req.body.firstResponseDueAt !== undefined)
        data.firstResponseDueAt = req.body.firstResponseDueAt ? new Date(req.body.firstResponseDueAt) : null;
    if (req.body.resolutionDueAt !== undefined)
        data.resolutionDueAt = req.body.resolutionDueAt ? new Date(req.body.resolutionDueAt) : null;
    const result = await prisma_1.default.ticket.update({ where: { id: req.params.id }, data, include: ticketInclude });
    return (0, response_1.successResponse)(res, 200, "Ticket updated", result);
});
exports.ticketsChangeStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await ticket(req.params.id);
    const user = req.user;
    const newStatus = enumValue(client_1.TicketStatus, req.body.status, current.status);
    if (newStatus === current.status)
        return (0, response_1.successResponse)(res, 200, "No status change", current);
    const updateData = {
        status: newStatus,
        statusLogs: { create: { fromStatus: current.status, toStatus: newStatus, changedById: user?.id, remarks: clean(req.body.remarks) } },
    };
    if (newStatus === "RESOLVED")
        updateData.resolvedAt = new Date();
    if (newStatus === "CLOSED")
        updateData.closedAt = new Date();
    if (newStatus === "ASSIGNED" && req.body.assignedToId) {
        updateData.assignedTo = { connect: { id: req.body.assignedToId } };
    }
    const result = await prisma_1.default.ticket.update({ where: { id: req.params.id }, data: updateData, include: ticketInclude });
    return (0, response_1.successResponse)(res, 200, "Ticket status updated", result);
});
exports.ticketsAssign = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await ticket(req.params.id);
    if (!req.body.employeeId)
        throw new AppError_1.AppError("Employee ID is required", 400);
    const employee = await prisma_1.default.employee.findUnique({ where: { id: req.body.employeeId } });
    if (!employee)
        throw new AppError_1.AppError("Employee not found", 404);
    const result = await prisma_1.default.ticket.update({
        where: { id: req.params.id },
        data: {
            assignedTo: { connect: { id: req.body.employeeId } },
            status: current.status === "OPEN" ? "ASSIGNED" : current.status,
            statusLogs: { create: { fromStatus: current.status, toStatus: current.status === "OPEN" ? "ASSIGNED" : current.status, changedById: req.user?.id, remarks: `Assigned to ${employee.employeeCode}` } },
        },
        include: ticketInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Ticket assigned", result);
});
/* Comments */
exports.ticketCommentsList = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await ticket(req.params.id);
    const comments = await prisma_1.default.ticketComment.findMany({
        where: { ticketId: req.params.id },
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
    });
    return (0, response_1.successResponse)(res, 200, "Ticket comments fetched", comments);
});
exports.ticketCommentsCreate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await ticket(req.params.id);
    if (!clean(req.body.body))
        throw new AppError_1.AppError("Comment body is required", 400);
    const user = req.user;
    const comment = await prisma_1.default.ticketComment.create({
        data: { ticketId: req.params.id, authorId: user?.id, body: clean(req.body.body), isInternal: req.body.isInternal === true },
        include: { author: { select: { id: true, name: true, email: true } } },
    });
    return (0, response_1.successResponse)(res, 201, "Comment added", comment);
});
/* SLA Logs */
exports.ticketsSlaEvent = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await ticket(req.params.id);
    const log = await prisma_1.default.ticketSlaLog.create({
        data: { ticketId: req.params.id, event: req.body.event, notes: clean(req.body.notes) },
    });
    return (0, response_1.successResponse)(res, 201, "SLA event logged", log);
});
