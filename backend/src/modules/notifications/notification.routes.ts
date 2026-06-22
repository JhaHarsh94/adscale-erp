import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import { list, markAllRead, markRead, remove, unreadCount } from "./notification.controller";

const router = Router();

router.get("/", protect, list);
router.get("/unread-count", protect, unreadCount);
router.put("/:id/read", protect, markRead);
router.put("/read-all", protect, markAllRead);
router.delete("/:id", protect, remove);

export default router;
