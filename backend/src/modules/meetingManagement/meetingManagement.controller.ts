import { ActionItemStatus, FormalMeetingStatus, type Prisma } from "@prisma/client";
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

const userSelect = { id: true, name: true, email: true };
const employeeWithUser = { id: true, employeeCode: true, user: { select: userSelect } };

const meetingInclude: Prisma.FormalMeetingInclude = {
  createdBy: { select: userSelect },
  agendaItems: { orderBy: { sortOrder: "asc" } },
  attendance: {
    include: { employee: { select: employeeWithUser } },
    orderBy: { joinedAt: "asc" },
  },
  minutes: true,
  actionItems: {
    include: { assignedTo: { select: employeeWithUser } },
    orderBy: { sortOrder: "asc" },
  },
};

async function formalMeeting(id: string) {
  const result = await prisma.formalMeeting.findUnique({ where: { id }, include: meetingInclude });
  if (!result) throw new AppError("Meeting not found", 404);
  return result;
}

export const dashboard = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const [total, scheduled, inProgress, completed, myMeetings] = await Promise.all([
    prisma.formalMeeting.count(),
    prisma.formalMeeting.count({ where: { status: "SCHEDULED" } }),
    prisma.formalMeeting.count({ where: { status: "IN_PROGRESS" } }),
    prisma.formalMeeting.count({ where: { status: "COMPLETED" } }),
    prisma.formalMeeting.count({ where: { createdById: user?.id } }),
  ]);
  return successResponse(res, 200, "Meeting management dashboard", { total, scheduled, inProgress, completed, myMeetings });
});

export const list = asyncHandler(async (req, res) => {
  const where: Prisma.FormalMeetingWhereInput = {};
  if (req.query.status) where.status = enumValue(FormalMeetingStatus, req.query.status, FormalMeetingStatus.SCHEDULED);
  if (req.query.fromDate) where.meetingDate = { gte: new Date(String(req.query.fromDate)) };
  if (req.query.toDate) where.meetingDate = { ...(where.meetingDate as any), lte: new Date(String(req.query.toDate)) };
  const meetings = await prisma.formalMeeting.findMany({
    where,
    include: meetingInclude,
    orderBy: { meetingDate: "desc" },
  });
  return successResponse(res, 200, "Meetings fetched", meetings);
});

export const getOne = asyncHandler(async (req, res) => successResponse(res, 200, "Meeting fetched", await formalMeeting(req.params.id)));

export const create = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const title = clean(req.body.title);
  if (!title) throw new AppError("Title is required", 400);
  if (!req.body.meetingDate) throw new AppError("Meeting date is required", 400);

  const result = await prisma.formalMeeting.create({
    data: {
      title,
      description: clean(req.body.description),
      meetingDate: new Date(req.body.meetingDate),
      startTime: req.body.startTime ? new Date(req.body.startTime) : null,
      endTime: req.body.endTime ? new Date(req.body.endTime) : null,
      location: clean(req.body.location),
      createdBy: { connect: { id: user?.id } },
      agendaItems: {
        create: (req.body.agendaItems || []).map((item: { title: string; description?: string; sortOrder?: number; durationMins?: number }, idx: number) => ({
          title: item.title,
          description: clean(item.description),
          sortOrder: item.sortOrder ?? idx + 1,
          durationMins: item.durationMins || null,
        })),
      },
    },
    include: meetingInclude,
  });
  return successResponse(res, 201, "Meeting created", result);
});

export const update = asyncHandler(async (req, res) => {
  const current = await formalMeeting(req.params.id);
  if (current.status === "COMPLETED" || current.status === "CANCELLED") throw new AppError("Cannot update completed or cancelled meetings", 400);

  const data: Prisma.FormalMeetingUpdateInput = {};
  if (req.body.title) data.title = clean(req.body.title)!;
  if (req.body.description !== undefined) data.description = clean(req.body.description) || undefined;
  if (req.body.meetingDate) data.meetingDate = new Date(req.body.meetingDate);
  if (req.body.startTime !== undefined) data.startTime = req.body.startTime ? new Date(req.body.startTime) : null;
  if (req.body.endTime !== undefined) data.endTime = req.body.endTime ? new Date(req.body.endTime) : null;
  if (req.body.location !== undefined) data.location = clean(req.body.location) || undefined;

  const result = await prisma.formalMeeting.update({
    where: { id: req.params.id },
    data,
    include: meetingInclude,
  });
  return successResponse(res, 200, "Meeting updated", result);
});

export const remove = asyncHandler(async (req, res) => {
  await formalMeeting(req.params.id);
  await prisma.formalMeeting.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, "Meeting deleted");
});

export const changeStatus = asyncHandler(async (req, res) => {
  const current = await formalMeeting(req.params.id);
  const action = clean(req.body.action);
  if (!action || !["IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(action)) throw new AppError("Action must be IN_PROGRESS, COMPLETED, or CANCELLED", 400);

  const data: Prisma.FormalMeetingUpdateInput = { status: action as FormalMeetingStatus };
  if (action === "IN_PROGRESS") data.startTime = current.startTime || new Date();
  if (action === "COMPLETED") data.endTime = new Date();

  const result = await prisma.formalMeeting.update({
    where: { id: req.params.id },
    data,
    include: meetingInclude,
  });
  return successResponse(res, 200, `Meeting ${action === "IN_PROGRESS" ? "started" : action === "COMPLETED" ? "completed" : "cancelled"}`, result);
});

export const updateAttendance = asyncHandler(async (req, res) => {
  await formalMeeting(req.params.id);
  const { employeeId, attended, notes } = req.body;
  if (!employeeId) throw new AppError("employeeId is required", 400);

  const record = await prisma.meetingAttendance.upsert({
    where: { meetingId_employeeId: { meetingId: req.params.id, employeeId } },
    update: { attended: attended ?? true, notes: clean(notes), joinedAt: attended ? new Date() : null },
    create: { meetingId: req.params.id, employeeId, attended: attended ?? true, notes: clean(notes), joinedAt: attended ? new Date() : null },
    include: { employee: { select: employeeWithUser } },
  });
  return successResponse(res, 200, "Attendance updated", record);
});

export const setMinutes = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  await formalMeeting(req.params.id);
  const content = clean(req.body.content);
  if (!content) throw new AppError("Minutes content is required", 400);

  const result = await prisma.meetingMinutes.upsert({
    where: { meetingId: req.params.id },
    update: { content, createdById: user?.id },
    create: { meetingId: req.params.id, content, createdById: user?.id },
  });
  return successResponse(res, 200, "Minutes saved", result);
});

export const getMinutes = asyncHandler(async (req, res) => {
  await formalMeeting(req.params.id);
  const minutes = await prisma.meetingMinutes.findUnique({ where: { meetingId: req.params.id } });
  return successResponse(res, 200, "Minutes fetched", minutes);
});

export const addActionItem = asyncHandler(async (req, res) => {
  await formalMeeting(req.params.id);
  const description = clean(req.body.description);
  if (!description) throw new AppError("Description is required", 400);

  const item = await prisma.meetingActionItem.create({
    data: {
      meetingId: req.params.id,
      description,
      assignedToId: clean(req.body.assignedToId),
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
      sortOrder: req.body.sortOrder ?? 0,
      notes: clean(req.body.notes),
    },
    include: { assignedTo: { select: employeeWithUser } },
  });
  return successResponse(res, 201, "Action item added", item);
});

export const updateActionItem = asyncHandler(async (req, res) => {
  const item = await prisma.meetingActionItem.findUnique({ where: { id: req.params.itemId } });
  if (!item) throw new AppError("Action item not found", 404);

  const data: Prisma.MeetingActionItemUpdateInput = {};
  if (req.body.description !== undefined) data.description = clean(req.body.description)!;
  if (req.body.assignedToId !== undefined) data.assignedTo = req.body.assignedToId ? { connect: { id: req.body.assignedToId } } : { disconnect: true };
  if (req.body.dueDate !== undefined) data.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
  if (req.body.status) data.status = enumValue(ActionItemStatus, req.body.status, ActionItemStatus.PENDING);
  if (req.body.notes !== undefined) data.notes = clean(req.body.notes) || undefined;
  if (req.body.status === "COMPLETED") data.completedAt = new Date();
  if (req.body.sortOrder !== undefined) data.sortOrder = req.body.sortOrder;

  const result = await prisma.meetingActionItem.update({
    where: { id: req.params.itemId },
    data,
    include: { assignedTo: { select: employeeWithUser } },
  });
  return successResponse(res, 200, "Action item updated", result);
});

export const deleteActionItem = asyncHandler(async (req, res) => {
  const item = await prisma.meetingActionItem.findUnique({ where: { id: req.params.itemId } });
  if (!item) throw new AppError("Action item not found", 404);
  await prisma.meetingActionItem.delete({ where: { id: req.params.itemId } });
  return successResponse(res, 200, "Action item deleted");
});

export const addAgendaItem = asyncHandler(async (req, res) => {
  await formalMeeting(req.params.id);
  const title = clean(req.body.title);
  if (!title) throw new AppError("Title is required", 400);

  const maxOrder = await prisma.meetingAgenda.aggregate({ where: { meetingId: req.params.id }, _max: { sortOrder: true } });
  const item = await prisma.meetingAgenda.create({
    data: {
      meetingId: req.params.id,
      title,
      description: clean(req.body.description),
      sortOrder: req.body.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
      durationMins: req.body.durationMins || null,
    },
  });
  return successResponse(res, 201, "Agenda item added", item);
});

export const deleteAgendaItem = asyncHandler(async (req, res) => {
  const item = await prisma.meetingAgenda.findUnique({ where: { id: req.params.agendaId } });
  if (!item) throw new AppError("Agenda item not found", 404);
  await prisma.meetingAgenda.delete({ where: { id: req.params.agendaId } });
  return successResponse(res, 200, "Agenda item deleted");
});
