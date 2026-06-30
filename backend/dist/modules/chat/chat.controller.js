"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listChatUsers = exports.getUnreadCount = exports.markRead = exports.sendMessage = exports.listMessages = exports.createGroupRoom = exports.createDirectRoom = exports.getRoom = exports.listRooms = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const AppError_1 = require("../../utils/AppError");
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const socket_1 = require("../../config/socket");
const clean = (value) => {
    if (value === null || value === undefined)
        return null;
    const str = String(value).trim();
    return str || null;
};
const userSelect = { id: true, name: true, email: true };
const roomInclude = {
    createdBy: { select: userSelect },
    members: {
        include: { user: { select: { ...userSelect, employee: { select: { id: true, employeeCode: true } } } } },
        orderBy: { joinedAt: "asc" },
    },
    _count: { select: { messages: true, members: true } },
};
const messageInclude = {
    sender: { select: { ...userSelect, employee: { select: { id: true, employeeCode: true } } } },
    attachments: true,
    reads: { include: { user: { select: userSelect } } },
};
async function room(id) {
    const result = await prisma_1.default.chatRoom.findUnique({ where: { id }, include: roomInclude });
    if (!result)
        throw new AppError_1.AppError("Chat room not found", 404);
    return result;
}
async function ensureMember(roomId, userId) {
    const member = await prisma_1.default.chatMember.findUnique({ where: { chatRoomId_userId: { chatRoomId: roomId, userId } } });
    if (!member)
        throw new AppError_1.AppError("You are not a member of this room", 403);
    return member;
}
/* ---- ROOMS ---- */
exports.listRooms = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const rooms = await prisma_1.default.chatRoom.findMany({
        where: { members: { some: { userId: user?.id } } },
        include: {
            ...roomInclude,
            messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: userSelect } } },
        },
        orderBy: { updatedAt: "desc" },
    });
    return (0, response_1.successResponse)(res, 200, "Rooms fetched", rooms);
});
exports.getRoom = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    await ensureMember(req.params.id, user.id);
    return (0, response_1.successResponse)(res, 200, "Room fetched", await room(req.params.id));
});
exports.createDirectRoom = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const targetUserId = clean(req.body.userId);
    if (!targetUserId)
        throw new AppError_1.AppError("userId is required", 400);
    if (targetUserId === user?.id)
        throw new AppError_1.AppError("Cannot create DM with yourself", 400);
    const existing = await prisma_1.default.chatRoom.findFirst({
        where: {
            type: "DIRECT",
            AND: [
                { members: { some: { userId: user?.id } } },
                { members: { some: { userId: targetUserId } } },
            ],
        },
        include: roomInclude,
    });
    if (existing)
        return (0, response_1.successResponse)(res, 200, "Room exists", existing);
    const room = await prisma_1.default.chatRoom.create({
        data: {
            type: "DIRECT",
            createdBy: { connect: { id: user?.id } },
            members: {
                create: [
                    { userId: user.id, role: "MEMBER" },
                    { userId: targetUserId, role: "MEMBER" },
                ],
            },
        },
        include: roomInclude,
    });
    return (0, response_1.successResponse)(res, 201, "Direct room created", room);
});
exports.createGroupRoom = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const name = clean(req.body.name);
    if (!name)
        throw new AppError_1.AppError("Room name is required", 400);
    const userIds = req.body.userIds || [];
    if (!Array.isArray(userIds) || userIds.length === 0)
        throw new AppError_1.AppError("At least one member is required", 400);
    const room = await prisma_1.default.chatRoom.create({
        data: {
            name,
            type: "GROUP",
            createdBy: { connect: { id: user?.id } },
            members: {
                create: [
                    { userId: user.id, role: "ADMIN" },
                    ...userIds.filter((uid) => uid !== user?.id).map((uid) => ({ userId: uid, role: "MEMBER" })),
                ],
            },
        },
        include: roomInclude,
    });
    return (0, response_1.successResponse)(res, 201, "Group room created", room);
});
/* ---- MESSAGES ---- */
exports.listMessages = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    await ensureMember(req.params.id, user.id);
    const where = { chatRoomId: req.params.id };
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    const take = Math.min(Number(req.query.take) || 50, 100);
    const messages = await prisma_1.default.message.findMany({
        where,
        include: messageInclude,
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const hasMore = messages.length > take;
    if (hasMore)
        messages.pop();
    return (0, response_1.successResponse)(res, 200, "Messages fetched", { messages: messages.reverse(), hasMore, nextCursor: hasMore ? messages[0]?.id : null });
});
exports.sendMessage = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    await ensureMember(req.params.id, user.id);
    const body = clean(req.body.body);
    if (!body)
        throw new AppError_1.AppError("Message body is required", 400);
    const message = await prisma_1.default.message.create({
        data: {
            chatRoomId: req.params.id,
            senderId: user?.id,
            body,
            messageType: req.body.messageType || "TEXT",
        },
        include: messageInclude,
    });
    await prisma_1.default.chatRoom.update({ where: { id: req.params.id }, data: { updatedAt: new Date() } });
    /* Emit via Socket.IO */
    const io = (0, socket_1.getIO)();
    const room = await prisma_1.default.chatRoom.findUnique({ where: { id: req.params.id }, include: { members: true } });
    if (room) {
        for (const member of room.members) {
            io.to(`user:${member.userId}`).emit("chat:message", message);
        }
        io.to(`room:${req.params.id}`).emit("chat:message", message);
    }
    return (0, response_1.successResponse)(res, 201, "Message sent", message);
});
/* ---- READ STATUS ---- */
exports.markRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    await ensureMember(req.params.id, user.id);
    const messages = await prisma_1.default.message.findMany({
        where: { chatRoomId: req.params.id, senderId: { not: user?.id } },
        select: { id: true },
    });
    if (messages.length > 0) {
        await prisma_1.default.messageRead.createMany({
            data: messages.map((m) => ({ messageId: m.id, userId: user.id })),
            skipDuplicates: true,
        });
    }
    await prisma_1.default.chatMember.update({
        where: { chatRoomId_userId: { chatRoomId: req.params.id, userId: user.id } },
        data: { lastReadAt: new Date() },
    });
    return (0, response_1.successResponse)(res, 200, "Marked as read");
});
exports.getUnreadCount = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const rooms = await prisma_1.default.chatRoom.findMany({
        where: { members: { some: { userId: user?.id } } },
        include: {
            members: { where: { userId: user?.id } },
            _count: { select: { messages: true } },
        },
    });
    let totalUnread = 0;
    for (const room of rooms) {
        const lastReadAt = room.members[0]?.lastReadAt;
        if (lastReadAt) {
            const unread = await prisma_1.default.message.count({
                where: { chatRoomId: room.id, createdAt: { gt: lastReadAt }, senderId: { not: user?.id } },
            });
            totalUnread += unread;
        }
        else {
            totalUnread += room._count.messages;
        }
    }
    return (0, response_1.successResponse)(res, 200, "Unread count", { totalUnread });
});
/* ---- USERS for DM start ---- */
exports.listChatUsers = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const users = await prisma_1.default.user.findMany({
        where: { status: "ACTIVE" },
        select: { ...userSelect, employee: { select: { id: true, employeeCode: true, department: { select: { name: true } } } } },
        orderBy: { name: "asc" },
    });
    return (0, response_1.successResponse)(res, 200, "Users fetched", users);
});
