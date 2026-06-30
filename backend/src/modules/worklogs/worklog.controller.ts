import type { Prisma } from "@prisma/client";
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

const employeeSelect = { id: true, employeeCode: true, user: { select: { name: true, email: true } } };

const workLogInclude: Prisma.WorkLogInclude = {
  employee: { select: employeeSelect },
  task: { select: { id: true, taskNumber: true, title: true, status: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
};

async function worklog(id: string) {
  const result = await prisma.workLog.findUnique({ where: { id }, include: workLogInclude });
  if (!result) throw new AppError("Work log not found", 404);
  return result;
}

/* Dashboard */
export const dashboard = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
  const employee = await prisma.employee.findUnique({ where: { userId: user?.id } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const employeeFilter = isAgent ? {} : { employeeId: employee?.id || "" };
  const where: Prisma.WorkLogWhereInput = { ...employeeFilter };

  const [totalLogs, todayLogs, todayMins, pendingApprovals, recentLogs] = await Promise.all([
    prisma.workLog.count({ where }),
    prisma.workLog.count({ where: { ...employeeFilter, date: { gte: today, lt: tomorrow } } }),
    prisma.workLog.aggregate({ where: { ...employeeFilter, date: { gte: today, lt: tomorrow } }, _sum: { durationMins: true } }),
    isAgent ? prisma.workLog.count({ where: { approved: false } }) : Promise.resolve(0),
    prisma.workLog.findMany({ where, include: workLogInclude, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return successResponse(res, 200, "Work log dashboard", {
    totalLogs,
    todayLogs,
    todayHours: Math.round((todayMins._sum.durationMins || 0) / 6) / 10,
    pendingApprovals,
    recentLogs,
  });
});

/* List */
export const list = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
  const where: Prisma.WorkLogWhereInput = {};

  if (!isAgent && user) {
    const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
    if (employee) where.employeeId = employee.id;
  }
  if (req.query.employeeId) where.employeeId = String(req.query.employeeId);
  if (req.query.taskId) where.taskId = String(req.query.taskId);
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
  if (req.query.approved === "true") where.approved = true;
  if (req.query.approved === "false") where.approved = false;

  const logs = await prisma.workLog.findMany({
    where,
    include: workLogInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return successResponse(res, 200, "Work logs fetched", logs);
});

/* Get today's logs for current user */
export const today = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const employee = await prisma.employee.findUnique({ where: { userId: user?.id } });
  if (!employee) throw new AppError("Employee profile not found", 404);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const logs = await prisma.workLog.findMany({
    where: { employeeId: employee.id, date: { gte: today, lt: tomorrow } },
    include: workLogInclude,
    orderBy: { createdAt: "desc" },
  });
  const totalMins = logs.reduce((sum, l) => sum + l.durationMins, 0);
  return successResponse(res, 200, "Today's work logs", { logs, totalMins, totalHours: Math.round(totalMins / 6) / 10 });
});

/* Get single */
export const getOne = asyncHandler(async (req, res) => successResponse(res, 200, "Work log fetched", await worklog(req.params.id)));

/* Create */
export const create = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const employee = await prisma.employee.findUnique({ where: { userId: user?.id } });
  if (!employee) throw new AppError("Employee profile not found", 404);

  const description = clean(req.body.description);
  if (!description) throw new AppError("Description is required", 400);

  const durationMins = Math.max(1, Number(req.body.durationMins) || 0);
  const logDate = req.body.date ? new Date(req.body.date) : new Date();
  if (isNaN(logDate.getTime())) throw new AppError("Invalid date", 400);

  const result = await prisma.workLog.create({
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
  return successResponse(res, 201, "Work log created", result);
});

/* Update */
export const update = asyncHandler(async (req, res) => {
  const current = await worklog(req.params.id);
  const data: Prisma.WorkLogUpdateInput = {};

  if (req.body.description !== undefined) data.description = clean(req.body.description) || undefined;
  if (req.body.durationMins !== undefined) data.durationMins = Math.max(1, Number(req.body.durationMins) || 0);
  if (req.body.date !== undefined) {
    const d = new Date(req.body.date);
    if (!isNaN(d.getTime())) data.date = d;
  }
  if (req.body.startTime !== undefined) data.startTime = req.body.startTime ? new Date(req.body.startTime) : null;
  if (req.body.endTime !== undefined) data.endTime = req.body.endTime ? new Date(req.body.endTime) : null;
  if (req.body.billable !== undefined) data.billable = Boolean(req.body.billable);
  if (req.body.taskId !== undefined) data.task = req.body.taskId ? { connect: { id: req.body.taskId } } : { disconnect: true };

  const result = await prisma.workLog.update({ where: { id: req.params.id }, data, include: workLogInclude });
  return successResponse(res, 200, "Work log updated", result);
});

/* Delete */
export const remove = asyncHandler(async (req, res) => {
  await worklog(req.params.id);
  await prisma.workLog.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, "Work log deleted");
});

/* Approve */
export const approve = asyncHandler(async (req, res) => {
  const current = await worklog(req.params.id);
  if (current.approved) throw new AppError("Work log already approved", 400);
  const user = (req as AuthRequest).user;
  const result = await prisma.workLog.update({
    where: { id: req.params.id },
    data: { approved: true, approvedById: user?.id, approvedAt: new Date() },
    include: workLogInclude,
  });
  return successResponse(res, 200, "Work log approved", result);
});

/* Report grouped by date */
export const report = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
  const where: Prisma.WorkLogWhereInput = {};

  if (!isAgent && user) {
    const employee = await prisma.employee.findUnique({ where: { userId: user.id } });
    if (employee) where.employeeId = employee.id;
  }
  if (req.query.employeeId) where.employeeId = String(req.query.employeeId);
  if (req.query.fromDate && req.query.toDate) {
    const from = new Date(String(req.query.fromDate));
    from.setHours(0, 0, 0, 0);
    const to = new Date(String(req.query.toDate));
    to.setHours(23, 59, 59, 999);
    where.date = { gte: from, lte: to };
  }

  const logs = await prisma.workLog.findMany({
    where,
    include: workLogInclude,
    orderBy: { date: "desc" },
  });

  const grouped: Record<string, { date: string; totalMins: number; totalHours: number; count: number; billableMins: number; logs: typeof logs }> = {};
  for (const log of logs) {
    const key = log.date.toISOString().split("T")[0];
    if (!grouped[key]) grouped[key] = { date: key, totalMins: 0, totalHours: 0, count: 0, billableMins: 0, logs: [] };
    grouped[key].totalMins += log.durationMins;
    grouped[key].count += 1;
    if (log.billable) grouped[key].billableMins += log.durationMins;
    grouped[key].logs.push(log);
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].totalHours = Math.round(grouped[key].totalMins / 6) / 10;
  }

  const sorted = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  return successResponse(res, 200, "Work log report fetched", sorted);
});
