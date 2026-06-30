import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import { approve, create, dashboard, getOne, list, remove, report, today, update } from "./worklog.controller";

const router = Router();

const readRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const writeRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const adminRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"];

router.get("/dashboard", protect, allowRoles(...readRoles), dashboard);
router.get("/", protect, allowRoles(...readRoles), list);
router.get("/today", protect, allowRoles(...readRoles), today);
router.get("/report", protect, allowRoles(...readRoles), report);
router.post("/", protect, allowRoles(...writeRoles), create);
router.get("/:id", protect, allowRoles(...readRoles), getOne);
router.put("/:id", protect, allowRoles(...writeRoles), update);
router.delete("/:id", protect, allowRoles(...adminRoles), remove);
router.post("/:id/approve", protect, allowRoles(...adminRoles), approve);

export default router;
