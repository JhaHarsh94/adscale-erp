"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.report = exports.approve = exports.remove = exports.update = exports.create = exports.getOne = exports.today = exports.list = exports.dashboard = void 0;
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
const employeeSelect = { id: true, employeeCode: true, user: { select: { name: true, email: true } } };
const workLogInclude = {
    employee: { select: employeeSelect },
    task: { select: { id: true, taskNumber: true, title: true, status: true } },
    approvedBy: { select: { id: true, name: true, email: true } },
};
async function worklog(id) {
    const result = await prisma_1.default.workLog.findUnique({ where: { id }, include: workLogInclude });
    if (!result)
        throw new AppError_1.AppError("Work log not found", 404);
    return result;
}
/* Dashboard */
exports.dashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
    const employee = await prisma_1.default.employee.findUnique({ where: { userId: user?.id } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const employeeFilter = isAgent ? {} : { employeeId: employee?.id || "" };
    const where = { ...employeeFilter };
    const [totalLogs, todayLogs, todayMins, pendingApprovals, recentLogs] = await Promise.all([
        prisma_1.default.workLog.count({ where }),
        prisma_1.default.workLog.count({ where: { ...employeeFilter, date: { gte: today, lt: tomorrow } } }),
        prisma_1.default.workLog.aggregate({ where: { ...employeeFilter, date: { gte: today, lt: tomorrow } }, _sum: { durationMins: true } }),
        isAgent ? prisma_1.default.workLog.count({ where: { approved: false } }) : Promise.resolve(0),
        prisma_1.default.workLog.findMany({ where, include: workLogInclude, orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    return (0, response_1.successResponse)(res, 200, "Work log dashboard", {
        totalLogs,
        todayLogs,
        todayHours: Math.round((todayMins._sum.durationMins || 0) / 6) / 10,
        pendingApprovals,
        recentLogs,
    });
});
/* List */
exports.list = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
    const where = {};
    if (!isAgent && user) {
        const employee = await prisma_1.default.employee.findUnique({ where: { userId: user.id } });
        if (employee)
            where.employeeId = employee.id;
    }
    if (req.query.employeeId)
        where.employeeId = String(req.query.employeeId);
    if (req.query.taskId)
        where.taskId = String(req.query.taskId);
    if (req.query.date) {
        const d = new Date(String(req.query.date));
        d.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setDate(end.getDate() + 1);
        where.date = { gte: d, lt: end };
    }
    if (req.query.fromDate && req.query.toDate) {
        const from = new Date(String(req.query.fromDate));
        from.setHours(0, 0, 0, 0);
        const to = new Date(String(req.query.toDate));
        to.setHours(23, 59, 59, 999);
        where.date = { gte: from, lte: to };
    }
    if (req.query.approved === "true")
        where.approved = true;
    if (req.query.approved === "false")
        where.approved = false;
    const logs = await prisma_1.default.workLog.findMany({
        where,
        include: workLogInclude,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return (0, response_1.successResponse)(res, 200, "Work logs fetched", logs);
});
/* Get today's logs for current user */
exports.today = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const employee = await prisma_1.default.employee.findUnique({ where: { userId: user?.id } });
    if (!employee)
        throw new AppError_1.AppError("Employee profile not found", 404);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const logs = await prisma_1.default.workLog.findMany({
        where: { employeeId: employee.id, date: { gte: today, lt: tomorrow } },
        include: workLogInclude,
        orderBy: { createdAt: "desc" },
    });
    const totalMins = logs.reduce((sum, l) => sum + l.durationMins, 0);
    return (0, response_1.successResponse)(res, 200, "Today's work logs", { logs, totalMins, totalHours: Math.round(totalMins / 6) / 10 });
});
/* Get single */
exports.getOne = (0, asyncHandler_1.asyncHandler)(async (req, res) => (0, response_1.successResponse)(res, 200, "Work log fetched", await worklog(req.params.id)));
/* Create */
exports.create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const employee = await prisma_1.default.employee.findUnique({ where: { userId: user?.id } });
    if (!employee)
        throw new AppError_1.AppError("Employee profile not found", 404);
    const description = clean(req.body.description);
    if (!description)
        throw new AppError_1.AppError("Description is required", 400);
    const durationMins = Math.max(1, Number(req.body.durationMins) || 0);
    const logDate = req.body.date ? new Date(req.body.date) : new Date();
    if (isNaN(logDate.getTime()))
        throw new AppError_1.AppError("Invalid date", 400);
    const result = await prisma_1.default.workLog.create({
        data: {
            employeeId: employee.id,
            taskId: clean(req.body.taskId) || undefined,
            date: logDate,
            startTime: req.body.startTime ? new Date(req.body.startTime) : null,
            endTime: req.body.endTime ? new Date(req.body.endTime) : null,
            durationMins,
            description,
            billable: req.body.billable !== false,
        },
        include: workLogInclude,
    });
    return (0, response_1.successResponse)(res, 201, "Work log created", result);
});
/* Update */
exports.update = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await worklog(req.params.id);
    const data = {};
    if (req.body.description !== undefined)
        data.description = clean(req.body.description) || undefined;
    if (req.body.durationMins !== undefined)
        data.durationMins = Math.max(1, Number(req.body.durationMins) || 0);
    if (req.body.date !== undefined) {
        const d = new Date(req.body.date);
        if (!isNaN(d.getTime()))
            data.date = d;
    }
    if (req.body.startTime !== undefined)
        data.startTime = req.body.startTime ? new Date(req.body.startTime) : null;
    if (req.body.endTime !== undefined)
        data.endTime = req.body.endTime ? new Date(req.body.endTime) : null;
    if (req.body.billable !== undefined)
        data.billable = Boolean(req.body.billable);
    if (req.body.taskId !== undefined)
        data.task = req.body.taskId ? { connect: { id: req.body.taskId } } : { disconnect: true };
    const result = await prisma_1.default.workLog.update({ where: { id: req.params.id }, data, include: workLogInclude });
    return (0, response_1.successResponse)(res, 200, "Work log updated", result);
});
/* Delete */
exports.remove = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await worklog(req.params.id);
    await prisma_1.default.workLog.delete({ where: { id: req.params.id } });
    return (0, response_1.successResponse)(res, 200, "Work log deleted");
});
/* Approve */
exports.approve = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await worklog(req.params.id);
    if (current.approved)
        throw new AppError_1.AppError("Work log already approved", 400);
    const user = req.user;
    const result = await prisma_1.default.workLog.update({
        where: { id: req.params.id },
        data: { approved: true, approvedById: user?.id, approvedAt: new Date() },
        include: workLogInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Work log approved", result);
});
/* Report grouped by date */
exports.report = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
    const where = {};
    if (!isAgent && user) {
        const employee = await prisma_1.default.employee.findUnique({ where: { userId: user.id } });
        if (employee)
            where.employeeId = employee.id;
    }
    if (req.query.employeeId)
        where.employeeId = String(req.query.employeeId);
    if (req.query.fromDate && req.query.toDate) {
        const from = new Date(String(req.query.fromDate));
        from.setHours(0, 0, 0, 0);
        const to = new Date(String(req.query.toDate));
        to.setHours(23, 59, 59, 999);
        where.date = { gte: from, lte: to };
    }
    const logs = await prisma_1.default.workLog.findMany({
        where,
        include: workLogInclude,
        orderBy: { date: "desc" },
    });
    const grouped = {};
    for (const log of logs) {
        const key = log.date.toISOString().split("T")[0];
        if (!grouped[key])
            grouped[key] = { date: key, totalMins: 0, totalHours: 0, count: 0, billableMins: 0, logs: [] };
        grouped[key].totalMins += log.durationMins;
        grouped[key].count += 1;
        if (log.billable)
            grouped[key].billableMins += log.durationMins;
        grouped[key].logs.push(log);
    }
    for (const key of Object.keys(grouped)) {
        grouped[key].totalHours = Math.round(grouped[key].totalMins / 6) / 10;
    }
    const sorted = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
    return (0, response_1.successResponse)(res, 200, "Work log report fetched", sorted);
});
