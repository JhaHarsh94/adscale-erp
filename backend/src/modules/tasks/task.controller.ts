import { randomBytes } from "crypto";
import { TaskPriority, TaskRecurrenceType, TaskStatus, type Prisma } from "@prisma/client";
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
const taskNumber = () => `TSK-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;

const employeeSelect = { id: true, employeeCode: true, user: { select: { name: true, email: true } } };

const taskInclude: Prisma.TaskInclude = {
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

async function task(id: string) {
  const result = await prisma.task.findUnique({ where: { id }, include: taskInclude });
  if (!result) throw new AppError("Task not found", 404);
  return result;
}

/* Dashboard */
export const dashboard = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
  const where: Prisma.TaskWhereInput = isAgent ? {} : { assignedTo: { user: { id: user?.id } } };
  const [total, backlog, todo, inProgress, inReview, done, cancelled] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({ where: { ...where, status: "BACKLOG" } }),
    prisma.task.count({ where: { ...where, status: "TODO" } }),
    prisma.task.count({ where: { ...where, status: "IN_PROGRESS" } }),
    prisma.task.count({ where: { ...where, status: "IN_REVIEW" } }),
    prisma.task.count({ where: { ...where, status: "DONE" } }),
    prisma.task.count({ where: { ...where, status: "CANCELLED" } }),
  ]);
  return successResponse(res, 200, "Task dashboard fetched", { total, backlog, todo, inProgress, inReview, done, cancelled });
});

/* Kanban - grouped by status */
export const kanban = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
  const where: Prisma.TaskWhereInput = {};
  if (!isAgent && user) where.assignedTo = { user: { id: user.id } };
  if (req.query.projectId) where.projectId = String(req.query.projectId);
  if (req.query.assignedToId) where.assignedToId = String(req.query.assignedToId);
  const tasks = await prisma.task.findMany({ where, include: taskInclude, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  const groups: Record<string, typeof tasks> = { BACKLOG: [], TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [], CANCELLED: [] };
  for (const t of tasks) { if (groups[t.status]) groups[t.status].push(t); else groups[t.status] = [t]; }
  return successResponse(res, 200, "Kanban board fetched", groups);
});

/* List */
export const list = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(user?.role || "");
  const where: Prisma.TaskWhereInput = {};
  if (!isAgent && user) where.assignedTo = { user: { id: user.id } };
  if (req.query.status) where.status = enumValue(TaskStatus, req.query.status, TaskStatus.TODO);
  if (req.query.priority) where.priority = enumValue(TaskPriority, req.query.priority, TaskPriority.MEDIUM);
  if (req.query.projectId) where.projectId = String(req.query.projectId);
  if (req.query.assignedToId) where.assignedToId = String(req.query.assignedToId);
  if (req.query.search) {
    where.OR = [
      { title: { contains: String(req.query.search), mode: "insensitive" } },
      { taskNumber: { contains: String(req.query.search), mode: "insensitive" } },
    ];
  }
  const tasks = await prisma.task.findMany({ where, include: taskInclude, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return successResponse(res, 200, "Tasks fetched", tasks);
});

export const getOne = asyncHandler(async (req, res) => successResponse(res, 200, "Task fetched", await task(req.params.id)));

export const create = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  if (!clean(req.body.title)) throw new AppError("Task title is required", 400);
  const result = await prisma.task.create({
    data: {
      taskNumber: taskNumber(),
      title: clean(req.body.title)!,
      description: clean(req.body.description),
      priority: enumValue(TaskPriority, req.body.priority, TaskPriority.MEDIUM),
      status: enumValue(TaskStatus, req.body.status, TaskStatus.TODO),
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      estimatedHrs: req.body.estimatedHrs === undefined ? undefined : Number(req.body.estimatedHrs) || null,
      sortOrder: Number(req.body.sortOrder || 0),
      project: req.body.projectId ? { connect: { id: req.body.projectId } } : undefined,
      milestone: req.body.milestoneId ? { connect: { id: req.body.milestoneId } } : undefined,
      assignedTo: req.body.assignedToId ? { connect: { id: req.body.assignedToId } } : undefined,
      createdBy: { connect: { id: user?.id } },
      parent: req.body.parentId ? { connect: { id: req.body.parentId } } : undefined,
      statusLogs: { create: { toStatus: enumValue(TaskStatus, req.body.status, TaskStatus.TODO), changedById: user?.id, remarks: "Task created" } },
    },
    include: taskInclude,
  });
  return successResponse(res, 201, "Task created", result);
});

export const update = asyncHandler(async (req, res) => {
  const current = await task(req.params.id);
  const data: Prisma.TaskUpdateInput = {};
  if (clean(req.body.title)) data.title = clean(req.body.title)!;
  if (req.body.description !== undefined) data.description = clean(req.body.description) || undefined;
  if (req.body.priority) data.priority = enumValue(TaskPriority, req.body.priority, current.priority);
  if (req.body.estimatedHrs !== undefined) data.estimatedHrs = Number(req.body.estimatedHrs) || null;
  if (req.body.actualHrs !== undefined) data.actualHrs = Number(req.body.actualHrs) || null;
  if (req.body.sortOrder !== undefined) data.sortOrder = Number(req.body.sortOrder);
  if (req.body.dueDate !== undefined) data.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
  if (req.body.projectId !== undefined) data.project = req.body.projectId ? { connect: { id: req.body.projectId } } : { disconnect: true };
  if (req.body.milestoneId !== undefined) data.milestone = req.body.milestoneId ? { connect: { id: req.body.milestoneId } } : { disconnect: true };
  if (req.body.assignedToId !== undefined) data.assignedTo = req.body.assignedToId ? { connect: { id: req.body.assignedToId } } : { disconnect: true };
  if (req.body.parentId !== undefined) data.parent = req.body.parentId ? { connect: { id: req.body.parentId } } : { disconnect: true };
  const result = await prisma.task.update({ where: { id: req.params.id }, data, include: taskInclude });
  return successResponse(res, 200, "Task updated", result);
});

export const changeStatus = asyncHandler(async (req, res) => {
  const current = await task(req.params.id);
  const user = (req as AuthRequest).user;
  const newStatus = enumValue(TaskStatus, req.body.status, current.status);
  if (newStatus === current.status) return successResponse(res, 200, "No status change", current);
  const updateData: Prisma.TaskUpdateInput = {
    status: newStatus,
    statusLogs: { create: { fromStatus: current.status, toStatus: newStatus, changedById: user?.id, remarks: clean(req.body.remarks) } },
  };
  const result = await prisma.task.update({ where: { id: req.params.id }, data: updateData, include: taskInclude });
  return successResponse(res, 200, "Task status updated", result);
});

export const reorder = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) throw new AppError("items array required", 400);
  await Promise.all(items.map((item: { id: string; sortOrder: number }) =>
    prisma.task.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })
  ));
  return successResponse(res, 200, "Tasks reordered");
});

/* Delete */
export const remove = asyncHandler(async (req, res) => {
  await task(req.params.id);
  await prisma.task.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, "Task deleted");
});

/* Dependencies */
export const addDependency = asyncHandler(async (req, res) => {
  await task(req.params.id);
  if (!req.body.dependsOnId) throw new AppError("dependsOnId is required", 400);
  const dep = await prisma.taskDependency.upsert({
    where: { taskId_dependsOnId: { taskId: req.params.id, dependsOnId: req.body.dependsOnId } },
    update: { dependencyType: String(req.body.dependencyType || "BLOCKS") },
    create: { taskId: req.params.id, dependsOnId: req.body.dependsOnId, dependencyType: String(req.body.dependencyType || "BLOCKS") },
  });
  return successResponse(res, 201, "Dependency added", dep);
});

export const removeDependency = asyncHandler(async (req, res) => {
  await prisma.taskDependency.delete({ where: { id: req.params.depId } });
  return successResponse(res, 200, "Dependency removed");
});

/* Comments */
export const commentsList = asyncHandler(async (req, res) => {
  await task(req.params.id);
  const comments = await prisma.taskComment.findMany({
    where: { taskId: req.params.id },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return successResponse(res, 200, "Comments fetched", comments);
});

export const commentsCreate = asyncHandler(async (req, res) => {
  await task(req.params.id);
  if (!clean(req.body.body)) throw new AppError("Comment body is required", 400);
  const user = (req as AuthRequest).user;
  const comment = await prisma.taskComment.create({
    data: { taskId: req.params.id, authorId: user?.id, body: clean(req.body.body)! },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  return successResponse(res, 201, "Comment added", comment);
});

/* Recurring Tasks */
export const recurringList = asyncHandler(async (_req, res) => {
  const items = await prisma.recurringTask.findMany({
    include: {
      project: { select: { id: true, name: true } },
      assignedTo: { select: employeeSelect },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return successResponse(res, 200, "Recurring tasks fetched", items);
});

export const recurringCreate = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  if (!clean(req.body.title) || !req.body.recurrenceType || !req.body.startDate) throw new AppError("Title, recurrenceType, and startDate are required", 400);
  const item = await prisma.recurringTask.create({
    data: {
      title: clean(req.body.title)!,
      description: clean(req.body.description),
      priority: enumValue(TaskPriority, req.body.priority, TaskPriority.MEDIUM),
      recurrenceType: enumValue(TaskRecurrenceType, req.body.recurrenceType, TaskRecurrenceType.WEEKLY),
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
  return successResponse(res, 201, "Recurring task created", item);
});

export const recurringDelete = asyncHandler(async (req, res) => {
  await prisma.recurringTask.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, "Recurring task deleted");
});
