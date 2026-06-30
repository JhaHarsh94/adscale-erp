import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  addActionItem, addAgendaItem, changeStatus, create, dashboard, deleteActionItem, deleteAgendaItem,
  getMinutes, getOne, list, remove, setMinutes, update, updateActionItem, updateAttendance,
} from "./meetingManagement.controller";

const router = Router();

const readRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const writeRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "SALES_MANAGER"];

router.get("/dashboard", protect, allowRoles(...readRoles), dashboard);
router.get("/", protect, allowRoles(...readRoles), list);
router.post("/", protect, allowRoles(...writeRoles), create);
router.get("/:id", protect, allowRoles(...readRoles), getOne);
router.put("/:id", protect, allowRoles(...writeRoles), update);
router.delete("/:id", protect, allowRoles(...readRoles), remove);
router.put("/:id/status", protect, allowRoles(...writeRoles), changeStatus);

router.put("/:id/attendance", protect, allowRoles(...writeRoles), updateAttendance);

router.get("/:id/minutes", protect, allowRoles(...readRoles), getMinutes);
router.put("/:id/minutes", protect, allowRoles(...writeRoles), setMinutes);

router.post("/:id/action-items", protect, allowRoles(...writeRoles), addActionItem);
router.put("/action-items/:itemId", protect, allowRoles(...writeRoles), updateActionItem);
router.delete("/action-items/:itemId", protect, allowRoles(...readRoles), deleteActionItem);

router.post("/:id/agenda", protect, allowRoles(...writeRoles), addAgendaItem);
router.delete("/agenda/:agendaId", protect, allowRoles(...readRoles), deleteAgendaItem);

export default router;
