"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recurringDelete = exports.recurringCreate = exports.recurringList = exports.commentsCreate = exports.commentsList = exports.removeDependency = exports.addDependency = exports.remove = exports.reorder = exports.changeStatus = exports.update = exports.create = exports.getOne = exports.list = exports.kanban = exports.dashboard = void 0;
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
const taskNumber = () => `TSK-${new Date().getFullYear()}-${(0, crypto_1.randomBytes)(3).toString("hex").toUpperCase()}`;
const employeeSelect = { id: true, employeeCode: true, user: { select: { name: true, email: true } } };
const taskInclude = {
    project: { select: { id: true, name: true, projectCode: true } },
    milestone: { select: { id: true, title: true } },
    assignedTo: { select: employeeSelect },
    createdBy: { select: { id: true, name: true, email: true } },
    parent: { select: { id: true, taskNumber: true, title: true } },
    subTasks: { select: { id: true, taskNumber: true, title: true, status: true } },
    comments: { include: { author: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } },
    dependencies: { include: { dependsOn: { select: { id: true, taskNumber: true, title: true, status: true } } } },
    dependentBy: { include: { task: { select: { id: true, taskNumber: true, title: true, status: true } } } },
    statusLogs: { include: { changedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
};
async function task(id) {
    const result = await prisma_1.default.task.findUnique({ where: { id }, include: taskInclude });
    if (!result)
        throw new AppError_1.AppError("Task not found", 404);
    return result;
}
/* Dashboard */
exports.dashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
    const where = isAgent ? {} : { assignedTo: { user: { id: user?.id } } };
    const [total, backlog, todo, inProgress, inReview, done, cancelled] = await Promise.all([
        prisma_1.default.task.count({ where }),
        prisma_1.default.task.count({ where: { ...where, status: "BACKLOG" } }),
        prisma_1.default.task.count({ where: { ...where, status: "TODO" } }),
        prisma_1.default.task.count({ where: { ...where, status: "IN_PROGRESS" } }),
        prisma_1.default.task.count({ where: { ...where, status: "IN_REVIEW" } }),
        prisma_1.default.task.count({ where: { ...where, status: "DONE" } }),
        prisma_1.default.task.count({ where: { ...where, status: "CANCELLED" } }),
    ]);
    return (0, response_1.successResponse)(res, 200, "Task dashboard fetched", { total, backlog, todo, inProgress, inReview, done, cancelled });
});
/* Kanban - grouped by status */
exports.kanban = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
    const where = {};
    if (!isAgent && user)
        where.assignedTo = { user: { id: user.id } };
    if (req.query.projectId)
        where.projectId = String(req.query.projectId);
    if (req.query.assignedToId)
        where.assignedToId = String(req.query.assignedToId);
    const tasks = await prisma_1.default.task.findMany({ where, include: taskInclude, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
    const groups = { BACKLOG: [], TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [], CANCELLED: [] };
    for (const t of tasks) {
        if (groups[t.status])
            groups[t.status].push(t);
        else
            groups[t.status] = [t];
    }
    return (0, response_1.successResponse)(res, 200, "Kanban board fetched", groups);
});
/* List */
exports.list = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
    const where = {};
    if (!isAgent && user)
        where.assignedTo = { user: { id: user.id } };
    if (req.query.status)
        where.status = enumValue(client_1.TaskStatus, req.query.status, client_1.TaskStatus.TODO);
    if (req.query.priority)
        where.priority = enumValue(client_1.TaskPriority, req.query.priority, client_1.TaskPriority.MEDIUM);
    if (req.query.projectId)
        where.projectId = String(req.query.projectId);
    if (req.query.assignedToId)
        where.assignedToId = String(req.query.assignedToId);
    if (req.query.search) {
        where.OR = [
            { title: { contains: String(req.query.search), mode: "insensitive" } },
            { taskNumber: { contains: String(req.query.search), mode: "insensitive" } },
        ];
    }
    const tasks = await prisma_1.default.task.findMany({ where, include: taskInclude, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
    return (0, response_1.successResponse)(res, 200, "Tasks fetched", tasks);
});
exports.getOne = (0, asyncHandler_1.asyncHandler)(async (req, res) => (0, response_1.successResponse)(res, 200, "Task fetched", await task(req.params.id)));
exports.create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    if (!clean(req.body.title))
        throw new AppError_1.AppError("Task title is required", 400);
    const result = await prisma_1.default.task.create({
        data: {
            taskNumber: taskNumber(),
            title: clean(req.body.title),
            description: clean(req.body.description),
            priority: enumValue(client_1.TaskPriority, req.body.priority, client_1.TaskPriority.MEDIUM),
            status: enumValue(client_1.TaskStatus, req.body.status, client_1.TaskStatus.TODO),
            dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
            estimatedHrs: req.body.estimatedHrs === undefined ? undefined : Number(req.body.estimatedHrs) || null,
            sortOrder: Number(req.body.sortOrder || 0),
            project: req.body.projectId ? { connect: { id: req.body.projectId } } : undefined,
            milestone: req.body.milestoneId ? { connect: { id: req.body.milestoneId } } : undefined,
            assignedTo: req.body.assignedToId ? { connect: { id: req.body.assignedToId } } : undefined,
            createdBy: { connect: { id: user?.id } },
            parent: req.body.parentId ? { connect: { id: req.body.parentId } } : undefined,
            statusLogs: { create: { toStatus: enumValue(client_1.TaskStatus, req.body.status, client_1.TaskStatus.TODO), changedById: user?.id, remarks: "Task created" } },
        },
        include: taskInclude,
    });
    return (0, response_1.successResponse)(res, 201, "Task created", result);
});
exports.update = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await task(req.params.id);
    const data = {};
    if (clean(req.body.title))
        data.title = clean(req.body.title);
    if (req.body.description !== undefined)
        data.description = clean(req.body.description) || undefined;
    if (req.body.priority)
        data.priority = enumValue(client_1.TaskPriority, req.body.priority, current.priority);
    if (req.body.estimatedHrs !== undefined)
        data.estimatedHrs = Number(req.body.estimatedHrs) || null;
    if (req.body.actualHrs !== undefined)
        data.actualHrs = Number(req.body.actualHrs) || null;
    if (req.body.sortOrder !== undefined)
        data.sortOrder = Number(req.body.sortOrder);
    if (req.body.dueDate !== undefined)
        data.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    if (req.body.projectId !== undefined)
        data.project = req.body.projectId ? { connect: { id: req.body.projectId } } : { disconnect: true };
    if (req.body.milestoneId !== undefined)
        data.milestone = req.body.milestoneId ? { connect: { id: req.body.milestoneId } } : { disconnect: true };
    if (req.body.assignedToId !== undefined)
        data.assignedTo = req.body.assignedToId ? { connect: { id: req.body.assignedToId } } : { disconnect: true };
    if (req.body.parentId !== undefined)
        data.parent = req.body.parentId ? { connect: { id: req.body.parentId } } : { disconnect: true };
    const result = await prisma_1.default.task.update({ where: { id: req.params.id }, data, include: taskInclude });
    return (0, response_1.successResponse)(res, 200, "Task updated", result);
});
exports.changeStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await task(req.params.id);
    const user = req.user;
    const newStatus = enumValue(client_1.TaskStatus, req.body.status, current.status);
    if (newStatus === current.status)
        return (0, response_1.successResponse)(res, 200, "No status change", current);
    const updateData = {
        status: newStatus,
        statusLogs: { create: { fromStatus: current.status, toStatus: newStatus, changedById: user?.id, remarks: clean(req.body.remarks) } },
    };
    const result = await prisma_1.default.task.update({ where: { id: req.params.id }, data: updateData, include: taskInclude });
    return (0, response_1.successResponse)(res, 200, "Task status updated", result);
});
exports.reorder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items))
        throw new AppError_1.AppError("items array required", 400);
    await Promise.all(items.map((item) => prisma_1.default.task.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));
    return (0, response_1.successResponse)(res, 200, "Tasks reordered");
});
/* Delete */
exports.remove = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await task(req.params.id);
    await prisma_1.default.task.delete({ where: { id: req.params.id } });
    return (0, response_1.successResponse)(res, 200, "Task deleted");
});
/* Dependencies */
exports.addDependency = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await task(req.params.id);
    if (!req.body.dependsOnId)
        throw new AppError_1.AppError("dependsOnId is required", 400);
    const dep = await prisma_1.default.taskDependency.upsert({
        where: { taskId_dependsOnId: { taskId: req.params.id, dependsOnId: req.body.dependsOnId } },
        update: { dependencyType: String(req.body.dependencyType || "BLOCKS") },
        create: { taskId: req.params.id, dependsOnId: req.body.dependsOnId, dependencyType: String(req.body.dependencyType || "BLOCKS") },
    });
    return (0, response_1.successResponse)(res, 201, "Dependency added", dep);
});
exports.removeDependency = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await prisma_1.default.taskDependency.delete({ where: { id: req.params.depId } });
    return (0, response_1.successResponse)(res, 200, "Dependency removed");
});
/* Comments */
exports.commentsList = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await task(req.params.id);
    const comments = await prisma_1.default.taskComment.findMany({
        where: { taskId: req.params.id },
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
    });
    return (0, response_1.successResponse)(res, 200, "Comments fetched", comments);
});
exports.commentsCreate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await task(req.params.id);
    if (!clean(req.body.body))
        throw new AppError_1.AppError("Comment body is required", 400);
    const user = req.user;
    const comment = await prisma_1.default.taskComment.create({
        data: { taskId: req.params.id, authorId: user?.id, body: clean(req.body.body) },
        include: { author: { select: { id: true, name: true, email: true } } },
    });
    return (0, response_1.successResponse)(res, 201, "Comment added", comment);
});
/* Recurring Tasks */
exports.recurringList = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const items = await prisma_1.default.recurringTask.findMany({
        include: {
            project: { select: { id: true, name: true } },
            assignedTo: { select: employeeSelect },
            createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    return (0, response_1.successResponse)(res, 200, "Recurring tasks fetched", items);
});
exports.recurringCreate = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    if (!clean(req.body.title) || !req.body.recurrenceType || !req.body.startDate)
        throw new AppError_1.AppError("Title, recurrenceType, and startDate are required", 400);
    const item = await prisma_1.default.recurringTask.create({
        data: {
            title: clean(req.body.title),
            description: clean(req.body.description),
            priority: enumValue(client_1.TaskPriority, req.body.priority, client_1.TaskPriority.MEDIUM),
            recurrenceType: enumValue(client_1.TaskRecurrenceType, req.body.recurrenceType, client_1.TaskRecurrenceType.WEEKLY),
            intervalValue: req.body.intervalValue ? Number(req.body.intervalValue) : 1,
            customCron: clean(req.body.customCron),
            startDate: new Date(req.body.startDate),
            endDate: req.body.endDate ? new Date(req.body.endDate) : null,
            nextOccurrence: new Date(req.body.startDate),
            project: req.body.projectId ? { connect: { id: req.body.projectId } } : undefined,
            assignedTo: req.body.assignedToId ? { connect: { id: req.body.assignedToId } } : undefined,
            createdBy: { connect: { id: user?.id } },
        },
        include: {
            project: { select: { id: true, name: true } },
            assignedTo: { select: employeeSelect },
            createdBy: { select: { id: true, name: true } },
        },
    });
    return (0, response_1.successResponse)(res, 201, "Recurring task created", item);
});
exports.recurringDelete = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await prisma_1.default.recurringTask.delete({ where: { id: req.params.id } });
    return (0, response_1.successResponse)(res, 200, "Recurring task deleted");
});
