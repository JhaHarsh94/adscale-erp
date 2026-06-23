import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  createDirectRoom, createGroupRoom, getRoom, getUnreadCount, listChatUsers, listMessages, listRooms, markRead, sendMessage,
} from "./chat.controller";

const router = Router();

const readRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];

router.get("/rooms", protect, allowRoles(...readRoles), listRooms);
router.get("/rooms/:id", protect, allowRoles(...readRoles), getRoom);
router.post("/rooms/direct", protect, allowRoles(...readRoles), createDirectRoom);
router.post("/rooms/group", protect, allowRoles(...readRoles), createGroupRoom);
router.get("/rooms/:id/messages", protect, allowRoles(...readRoles), listMessages);
router.post("/rooms/:id/messages", protect, allowRoles(...readRoles), sendMessage);
router.post("/rooms/:id/read", protect, allowRoles(...readRoles), markRead);
router.get("/unread", protect, allowRoles(...readRoles), getUnreadCount);
router.get("/users", protect, allowRoles(...readRoles), listChatUsers);

export default router;
