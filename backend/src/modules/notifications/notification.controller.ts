import { getIO } from "../../config/socket";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";

export const list = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const notifications = await prisma.notification.findMany({
    where: { userId: user?.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return successResponse(res, 200, "Notifications fetched", notifications);
});

export const unreadCount = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const count = await prisma.notification.count({ where: { userId: user?.id, isRead: false } });
  return successResponse(res, 200, "Unread count fetched", { count });
});

export const markRead = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const notification = await prisma.notification.findFirst({ where: { id: req.params.id, userId: user?.id } });
  if (!notification) throw new AppError("Notification not found", 404);
  await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true, readAt: new Date() } });
  getIO().to(`user:${user?.id}`).emit("notification:updated", { unreadCount: await prisma.notification.count({ where: { userId: user?.id, isRead: false } }) });
  return successResponse(res, 200, "Notification marked as read");
});

export const markAllRead = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  await prisma.notification.updateMany({ where: { userId: user?.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
  getIO().to(`user:${user?.id}`).emit("notification:updated", { unreadCount: 0 });
  return successResponse(res, 200, "All notifications marked as read");
});

export const remove = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const notification = await prisma.notification.findFirst({ where: { id: req.params.id, userId: user?.id } });
  if (!notification) throw new AppError("Notification not found", 404);
  await prisma.notification.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, "Notification deleted");
});

/* Helper for other modules to create notifications with real-time emit */
export async function createNotification(data: { userId: string; title: string; message: string; type?: string; link?: string }) {
  const notification = await prisma.notification.create({ data: { userId: data.userId, title: data.title, message: data.message, type: data.type || "INFO", link: data.link } });
  getIO().to(`user:${data.userId}`).emit("notification:new", notification);
  getIO().to(`user:${data.userId}`).emit("notification:updated", { unreadCount: await prisma.notification.count({ where: { userId: data.userId, isRead: false } }) });
  return notification;
}
