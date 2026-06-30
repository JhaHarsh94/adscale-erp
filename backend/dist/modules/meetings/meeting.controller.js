"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinMeeting = exports.cancelMeeting = exports.endMeeting = exports.startMeeting = exports.remove = exports.update = exports.create = exports.getOne = exports.list = exports.dashboard = void 0;
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
const userSelect = { id: true, name: true, email: true };
const participantInclude = { user: { select: { ...userSelect, employee: { select: { id: true, employeeCode: true } } } } };
const recordingInclude = { createdBy: { select: userSelect } };
const meetingInclude = {
    createdBy: { select: userSelect },
    participants: { include: participantInclude, orderBy: { joinedAt: "asc" } },
    recordings: { include: recordingInclude, orderBy: { createdAt: "desc" } },
    _count: { select: { participants: true, recordings: true } },
};
function roomName() {
    return `adscale-${Date.now()}-${(0, crypto_1.randomBytes)(4).toString("hex")}`;
}
async function meeting(id) {
    const result = await prisma_1.default.videoMeeting.findUnique({ where: { id }, include: meetingInclude });
    if (!result)
        throw new AppError_1.AppError("Meeting not found", 404);
    return result;
}
exports.dashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const myWhere = { createdById: user?.id };
    const [total, scheduled, active, ended, myMeetings] = await Promise.all([
        prisma_1.default.videoMeeting.count(),
        prisma_1.default.videoMeeting.count({ where: { status: "SCHEDULED" } }),
        prisma_1.default.videoMeeting.count({ where: { status: "ACTIVE" } }),
        prisma_1.default.videoMeeting.count({ where: { status: "ENDED" } }),
        prisma_1.default.videoMeeting.count({ where: myWhere }),
    ]);
    return (0, response_1.successResponse)(res, 200, "Meeting dashboard", { total, scheduled, active, ended, myMeetings });
});
exports.list = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const where = {};
    if (req.query.status)
        where.status = enumValue(client_1.MeetingStatus, req.query.status, client_1.MeetingStatus.SCHEDULED);
    else
        where.status = { notIn: ["CANCELLED"] };
    if (req.query.fromDate && req.query.toDate) {
        where.createdAt = { gte: new Date(String(req.query.fromDate)), lte: new Date(String(req.query.toDate)) };
    }
    const meetings = await prisma_1.default.videoMeeting.findMany({ where, include: meetingInclude, orderBy: { createdAt: "desc" } });
    return (0, response_1.successResponse)(res, 200, "Meetings fetched", meetings);
});
exports.getOne = (0, asyncHandler_1.asyncHandler)(async (req, res) => (0, response_1.successResponse)(res, 200, "Meeting fetched", await meeting(req.params.id)));
exports.create = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const title = clean(req.body.title);
    if (!title)
        throw new AppError_1.AppError("Title is required", 400);
    const meetingType = enumValue(client_1.MeetingType, req.body.meetingType, client_1.MeetingType.INSTANT);
    const result = await prisma_1.default.videoMeeting.create({
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
    return (0, response_1.successResponse)(res, 201, "Meeting created", result);
});
exports.update = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await meeting(req.params.id);
    if (current.status !== "SCHEDULED")
        throw new AppError_1.AppError("Can only update scheduled meetings", 400);
    const data = {};
    if (req.body.title)
        data.title = clean(req.body.title);
    if (req.body.description !== undefined)
        data.description = clean(req.body.description) || undefined;
    if (req.body.scheduledAt)
        data.scheduledAt = new Date(req.body.scheduledAt);
    const result = await prisma_1.default.videoMeeting.update({ where: { id: req.params.id }, data, include: meetingInclude });
    return (0, response_1.successResponse)(res, 200, "Meeting updated", result);
});
exports.remove = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    await meeting(req.params.id);
    await prisma_1.default.videoMeeting.delete({ where: { id: req.params.id } });
    return (0, response_1.successResponse)(res, 200, "Meeting deleted");
});
exports.startMeeting = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await meeting(req.params.id);
    if (current.status === "ENDED" || current.status === "CANCELLED")
        throw new AppError_1.AppError("Cannot start a finished meeting", 400);
    const result = await prisma_1.default.videoMeeting.update({
        where: { id: req.params.id },
        data: { status: "ACTIVE", startedAt: current.startedAt || new Date() },
        include: meetingInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Meeting started", result);
});
exports.endMeeting = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await meeting(req.params.id);
    if (current.status !== "ACTIVE")
        throw new AppError_1.AppError("Meeting is not active", 400);
    const result = await prisma_1.default.videoMeeting.update({
        where: { id: req.params.id },
        data: { status: "ENDED", endedAt: new Date() },
        include: meetingInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Meeting ended", result);
});
exports.cancelMeeting = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await meeting(req.params.id);
    if (current.status === "ENDED" || current.status === "CANCELLED")
        throw new AppError_1.AppError("Meeting already finished", 400);
    const result = await prisma_1.default.videoMeeting.update({
        where: { id: req.params.id },
        data: { status: "CANCELLED" },
        include: meetingInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Meeting cancelled", result);
});
exports.joinMeeting = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const current = await meeting(req.params.id);
    const user = req.user;
    if (current.status === "ENDED" || current.status === "CANCELLED")
        throw new AppError_1.AppError("Meeting has ended", 400);
    const participant = await prisma_1.default.meetingParticipant.upsert({
        where: { meetingId_userId: { meetingId: req.params.id, userId: user.id } },
        update: {},
        create: { meetingId: req.params.id, userId: user?.id },
        include: participantInclude,
    });
    if (current.status === "SCHEDULED") {
        await prisma_1.default.videoMeeting.update({ where: { id: req.params.id }, data: { status: "ACTIVE", startedAt: new Date() } });
    }
    const updated = await meeting(req.params.id);
    return (0, response_1.successResponse)(res, 200, "Joined meeting", { participant, meeting: updated });
});
