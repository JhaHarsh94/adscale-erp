import { randomBytes } from "crypto";
import { MeetingStatus, MeetingType, type Prisma } from "@prisma/client";
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
const participantInclude = { user: { select: { ...userSelect, employee: { select: { id: true, employeeCode: true } } } } };
const recordingInclude = { createdBy: { select: userSelect } };

const meetingInclude: Prisma.VideoMeetingInclude = {
  createdBy: { select: userSelect },
  participants: { include: participantInclude, orderBy: { joinedAt: "asc" } },
  recordings: { include: recordingInclude, orderBy: { createdAt: "desc" } },
  _count: { select: { participants: true, recordings: true } },
};

function roomName() {
  return `adscale-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

async function meeting(id: string) {
  const result = await prisma.videoMeeting.findUnique({ where: { id }, include: meetingInclude });
  if (!result) throw new AppError("Meeting not found", 404);
  return result;
}

export const dashboard = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const myWhere: Prisma.VideoMeetingWhereInput = { createdById: user?.id };
  const [total, scheduled, active, ended, myMeetings] = await Promise.all([
    prisma.videoMeeting.count(),
    prisma.videoMeeting.count({ where: { status: "SCHEDULED" } }),
    prisma.videoMeeting.count({ where: { status: "ACTIVE" } }),
    prisma.videoMeeting.count({ where: { status: "ENDED" } }),
    prisma.videoMeeting.count({ where: myWhere }),
  ]);
  return successResponse(res, 200, "Meeting dashboard", { total, scheduled, active, ended, myMeetings });
});

export const list = asyncHandler(async (req, res) => {
  const where: Prisma.VideoMeetingWhereInput = {};
  if (req.query.status) where.status = enumValue(MeetingStatus, req.query.status, MeetingStatus.SCHEDULED);
  else where.status = { notIn: ["CANCELLED"] as MeetingStatus[] };
  if (req.query.fromDate && req.query.toDate) {
    where.createdAt = { gte: new Date(String(req.query.fromDate)), lte: new Date(String(req.query.toDate)) };
  }
  const meetings = await prisma.videoMeeting.findMany({ where, include: meetingInclude, orderBy: { createdAt: "desc" } });
  return successResponse(res, 200, "Meetings fetched", meetings);
});

export const getOne = asyncHandler(async (req, res) => successResponse(res, 200, "Meeting fetched", await meeting(req.params.id)));

export const create = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const title = clean(req.body.title);
  if (!title) throw new AppError("Title is required", 400);
  const meetingType = enumValue(MeetingType, req.body.meetingType, MeetingType.INSTANT);

  const result = await prisma.videoMeeting.create({
    data: {
      title,
      description: clean(req.body.description),
      roomName: roomName(),
      meetingType,
      scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : (meetingType === "INSTANT" ? new Date() : null),
      status: meetingType === "INSTANT" ? "ACTIVE" : "SCHEDULED",
      startedAt: meetingType === "INSTANT" ? new Date() : null,
      createdBy: { connect: { id: user?.id } },
    },
    include: meetingInclude,
  });
  return successResponse(res, 201, "Meeting created", result);
});

export const update = asyncHandler(async (req, res) => {
  const current = await meeting(req.params.id);
  if (current.status !== "SCHEDULED") throw new AppError("Can only update scheduled meetings", 400);
  const data: Prisma.VideoMeetingUpdateInput = {};
  if (req.body.title) data.title = clean(req.body.title)!;
  if (req.body.description !== undefined) data.description = clean(req.body.description) || undefined;
  if (req.body.scheduledAt) data.scheduledAt = new Date(req.body.scheduledAt);
  const result = await prisma.videoMeeting.update({ where: { id: req.params.id }, data, include: meetingInclude });
  return successResponse(res, 200, "Meeting updated", result);
});

export const remove = asyncHandler(async (req, res) => {
  await meeting(req.params.id);
  await prisma.videoMeeting.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, "Meeting deleted");
});

export const startMeeting = asyncHandler(async (req, res) => {
  const current = await meeting(req.params.id);
  if (current.status === "ENDED" || current.status === "CANCELLED") throw new AppError("Cannot start a finished meeting", 400);
  const result = await prisma.videoMeeting.update({
    where: { id: req.params.id },
    data: { status: "ACTIVE", startedAt: current.startedAt || new Date() },
    include: meetingInclude,
  });
  return successResponse(res, 200, "Meeting started", result);
});

export const endMeeting = asyncHandler(async (req, res) => {
  const current = await meeting(req.params.id);
  if (current.status !== "ACTIVE") throw new AppError("Meeting is not active", 400);
  const result = await prisma.videoMeeting.update({
    where: { id: req.params.id },
    data: { status: "ENDED", endedAt: new Date() },
    include: meetingInclude,
  });
  return successResponse(res, 200, "Meeting ended", result);
});

export const cancelMeeting = asyncHandler(async (req, res) => {
  const current = await meeting(req.params.id);
  if (current.status === "ENDED" || current.status === "CANCELLED") throw new AppError("Meeting already finished", 400);
  const result = await prisma.videoMeeting.update({
    where: { id: req.params.id },
    data: { status: "CANCELLED" },
    include: meetingInclude,
  });
  return successResponse(res, 200, "Meeting cancelled", result);
});

export const joinMeeting = asyncHandler(async (req, res) => {
  const current = await meeting(req.params.id);
  const user = (req as AuthRequest).user;
  if (current.status === "ENDED" || current.status === "CANCELLED") throw new AppError("Meeting has ended", 400);
  const participant = await prisma.meetingParticipant.upsert({
    where: { meetingId_userId: { meetingId: req.params.id, userId: user!.id } },
    update: {},
    create: { meetingId: req.params.id, userId: user?.id },
    include: participantInclude,
  });
  if (current.status === "SCHEDULED") {
    await prisma.videoMeeting.update({ where: { id: req.params.id }, data: { status: "ACTIVE", startedAt: new Date() } });
  }
  const updated = await meeting(req.params.id);
  return successResponse(res, 200, "Joined meeting", { participant, meeting: updated });
});
