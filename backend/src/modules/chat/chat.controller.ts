import type { Prisma } from "@prisma/client";
import { Response } from "express";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";
import { getIO } from "../../config/socket";

const clean = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str || null;
};

const userSelect = { id: true, name: true, email: true };

const roomInclude: Prisma.ChatRoomInclude = {
  createdBy: { select: userSelect },
  members: {
    include: { user: { select: { ...userSelect, employee: { select: { id: true, employeeCode: true } } } } },
    orderBy: { joinedAt: "asc" },
  },
  _count: { select: { messages: true, members: true } },
};

const messageInclude: Prisma.MessageInclude = {
  sender: { select: { ...userSelect, employee: { select: { id: true, employeeCode: true } } } },
  attachments: true,
  reads: { include: { user: { select: userSelect } } },
};

async function room(id: string) {
  const result = await prisma.chatRoom.findUnique({ where: { id }, include: roomInclude });
  if (!result) throw new AppError("Chat room not found", 404);
  return result;
}

async function ensureMember(roomId: string, userId: string) {
  const member = await prisma.chatMember.findUnique({ where: { chatRoomId_userId: { chatRoomId: roomId, userId } } });
  if (!member) throw new AppError("You are not a member of this room", 403);
  return member;
}

/* ---- ROOMS ---- */

export const listRooms = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const rooms = await prisma.chatRoom.findMany({
    where: { members: { some: { userId: user?.id } } },
    include: {
      ...roomInclude,
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: userSelect } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return successResponse(res, 200, "Rooms fetched", rooms);
});

export const getRoom = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  await ensureMember(req.params.id, user!.id);
  return successResponse(res, 200, "Room fetched", await room(req.params.id));
});

export const createDirectRoom = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const targetUserId = clean(req.body.userId);
  if (!targetUserId) throw new AppError("userId is required", 400);
  if (targetUserId === user?.id) throw new AppError("Cannot create DM with yourself", 400);

  const existing = await prisma.chatRoom.findFirst({
    where: {
      type: "DIRECT",
      AND: [
        { members: { some: { userId: user?.id } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
    include: roomInclude,
  });
  if (existing) return successResponse(res, 200, "Room exists", existing);

  const room = await prisma.chatRoom.create({
    data: {
      type: "DIRECT",
      createdBy: { connect: { id: user?.id } },
      members: {
        create: [
          { userId: user!.id, role: "MEMBER" },
          { userId: targetUserId, role: "MEMBER" },
        ],
      },
    },
    include: roomInclude,
  });
  return successResponse(res, 201, "Direct room created", room);
});

export const createGroupRoom = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const name = clean(req.body.name);
  if (!name) throw new AppError("Room name is required", 400);
  const userIds: string[] = req.body.userIds || [];
  if (!Array.isArray(userIds) || userIds.length === 0) throw new AppError("At least one member is required", 400);

  const room = await prisma.chatRoom.create({
    data: {
      name,
      type: "GROUP",
      createdBy: { connect: { id: user?.id } },
      members: {
        create: [
          { userId: user!.id, role: "ADMIN" },
          ...userIds.filter((uid: string) => uid !== user?.id).map((uid: string) => ({ userId: uid, role: "MEMBER" as const })),
        ],
      },
    },
    include: roomInclude,
  });
  return successResponse(res, 201, "Group room created", room);
});

/* ---- MESSAGES ---- */

export const listMessages = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  await ensureMember(req.params.id, user!.id);

  const where: Prisma.MessageWhereInput = { chatRoomId: req.params.id };
  const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
  const take = Math.min(Number(req.query.take) || 50, 100);

  const messages = await prisma.message.findMany({
    where,
    include: messageInclude,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = messages.length > take;
  if (hasMore) messages.pop();

  return successResponse(res, 200, "Messages fetched", { messages: messages.reverse(), hasMore, nextCursor: hasMore ? messages[0]?.id : null });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  await ensureMember(req.params.id, user!.id);
  const body = clean(req.body.body);
  if (!body) throw new AppError("Message body is required", 400);

  const message = await prisma.message.create({
    data: {
      chatRoomId: req.params.id,
      senderId: user?.id,
      body,
      messageType: req.body.messageType || "TEXT",
    },
    include: messageInclude,
  });

  await prisma.chatRoom.update({ where: { id: req.params.id }, data: { updatedAt: new Date() } });

  /* Emit via Socket.IO */
  const io = getIO();
  const room = await prisma.chatRoom.findUnique({ where: { id: req.params.id }, include: { members: true } });
  if (room) {
    for (const member of room.members) {
      io.to(`user:${member.userId}`).emit("chat:message", message);
    }
    io.to(`room:${req.params.id}`).emit("chat:message", message);
  }

  return successResponse(res, 201, "Message sent", message);
});

/* ---- READ STATUS ---- */

export const markRead = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  await ensureMember(req.params.id, user!.id);

  const messages = await prisma.message.findMany({
    where: { chatRoomId: req.params.id, senderId: { not: user?.id } },
    select: { id: true },
  });

  if (messages.length > 0) {
    await prisma.messageRead.createMany({
      data: messages.map((m) => ({ messageId: m.id, userId: user!.id })),
      skipDuplicates: true,
    });
  }

  await prisma.chatMember.update({
    where: { chatRoomId_userId: { chatRoomId: req.params.id, userId: user!.id } },
    data: { lastReadAt: new Date() },
  });

  return successResponse(res, 200, "Marked as read");
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const rooms = await prisma.chatRoom.findMany({
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
      const unread = await prisma.message.count({
        where: { chatRoomId: room.id, createdAt: { gt: lastReadAt }, senderId: { not: user?.id } },
      });
      totalUnread += unread;
    } else {
      totalUnread += room._count.messages;
    }
  }

  return successResponse(res, 200, "Unread count", { totalUnread });
});

/* ---- USERS for DM start ---- */

export const listChatUsers = asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: { ...userSelect, employee: { select: { id: true, employeeCode: true, department: { select: { name: true } } } } },
    orderBy: { name: "asc" },
  });
  return successResponse(res, 200, "Users fetched", users);
});
