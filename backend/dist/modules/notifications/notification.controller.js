"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.markAllRead = exports.markRead = exports.unreadCount = exports.list = void 0;
exports.createNotification = createNotification;
const socket_1 = require("../../config/socket");
const prisma_1 = __importDefault(require("../../config/prisma"));
const AppError_1 = require("../../utils/AppError");
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
exports.list = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const notifications = await prisma_1.default.notification.findMany({
        where: { userId: user?.id },
        orderBy: { createdAt: "desc" },
        take: 50,
    });
    return (0, response_1.successResponse)(res, 200, "Notifications fetched", notifications);
});
exports.unreadCount = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const count = await prisma_1.default.notification.count({ where: { userId: user?.id, isRead: false } });
    return (0, response_1.successResponse)(res, 200, "Unread count fetched", { count });
});
exports.markRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const notification = await prisma_1.default.notification.findFirst({ where: { id: req.params.id, userId: user?.id } });
    if (!notification)
        throw new AppError_1.AppError("Notification not found", 404);
    await prisma_1.default.notification.update({ where: { id: req.params.id }, data: { isRead: true, readAt: new Date() } });
    (0, socket_1.getIO)().to(`user:${user?.id}`).emit("notification:updated", { unreadCount: await prisma_1.default.notification.count({ where: { userId: user?.id, isRead: false } }) });
    return (0, response_1.successResponse)(res, 200, "Notification marked as read");
});
exports.markAllRead = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    await prisma_1.default.notification.updateMany({ where: { userId: user?.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
    (0, socket_1.getIO)().to(`user:${user?.id}`).emit("notification:updated", { unreadCount: 0 });
    return (0, response_1.successResponse)(res, 200, "All notifications marked as read");
});
exports.remove = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const notification = await prisma_1.default.notification.findFirst({ where: { id: req.params.id, userId: user?.id } });
    if (!notification)
        throw new AppError_1.AppError("Notification not found", 404);
    await prisma_1.default.notification.delete({ where: { id: req.params.id } });
    return (0, response_1.successResponse)(res, 200, "Notification deleted");
});
/* Helper for other modules to create notifications with real-time emit */
async function createNotification(data) {
    const notification = await prisma_1.default.notification.create({ data: { userId: data.userId, title: data.title, message: data.message, type: data.type || "INFO", link: data.link } });
    (0, socket_1.getIO)().to(`user:${data.userId}`).emit("notification:new", notification);
    (0, socket_1.getIO)().to(`user:${data.userId}`).emit("notification:updated", { unreadCount: await prisma_1.default.notification.count({ where: { userId: data.userId, isRead: false } }) });
    return notification;
}
