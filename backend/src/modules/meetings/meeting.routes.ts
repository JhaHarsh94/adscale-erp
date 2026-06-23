import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  cancelMeeting, create, dashboard, endMeeting, getOne, joinMeeting, list, remove, startMeeting, update,
} from "./meeting.controller";

const router = Router();

const readRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const writeRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];

router.get("/dashboard", protect, allowRoles(...readRoles), dashboard);
router.get("/", protect, allowRoles(...readRoles), list);
router.post("/", protect, allowRoles(...writeRoles), create);
router.get("/:id", protect, allowRoles(...readRoles), getOne);
router.put("/:id", protect, allowRoles(...writeRoles), update);
router.delete("/:id", protect, allowRoles(...readRoles), remove);
router.post("/:id/start", protect, allowRoles(...writeRoles), startMeeting);
router.post("/:id/end", protect, allowRoles(...writeRoles), endMeeting);
router.post("/:id/cancel", protect, allowRoles(...writeRoles), cancelMeeting);
router.post("/:id/join", protect, allowRoles(...readRoles), joinMeeting);

export default router;
