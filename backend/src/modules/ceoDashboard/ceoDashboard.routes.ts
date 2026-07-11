import { Router } from "express";
import { protect, allowRoles } from "../../middlewares/auth.middleware";
import {
  ceoOverview,
  ceoRecentActivity,
  ceoCreateEmployee,
  ceoCreateProject,
  ceoCreateTask,
  ceoCreateTicket,
  ceoModuleStats,
} from "./ceoDashboard.controller";

const router = Router();

const ceoRoles = ["SUPER_ADMIN", "DIRECTOR"];

router.use(protect);
router.use(allowRoles(...ceoRoles));

router.get("/overview", ceoOverview);
router.get("/recent-activity", ceoRecentActivity);
router.get("/module-stats", ceoModuleStats);

router.post("/create-employee", ceoCreateEmployee);
router.post("/create-project", ceoCreateProject);
router.post("/create-task", ceoCreateTask);
router.post("/create-ticket", ceoCreateTicket);

export default router;
