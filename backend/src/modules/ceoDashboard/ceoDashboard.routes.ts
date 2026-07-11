import { Router } from "express";
import { protect, allowRoles } from "../../middlewares/auth.middleware";
import {
  ceoOverview,
  ceoRecentActivity,
  ceoModuleStats,
  ceoCreateEmployee,
  ceoCreateProject,
  ceoCreateTask,
  ceoCreateTicket,
  ceoCreateSuperAdmin,
} from "./ceoDashboard.controller";

const router = Router();

const ceoRoles = ["SUPER_ADMIN"];

router.use(protect);
router.use(allowRoles(...ceoRoles));

router.get("/overview", ceoOverview);
router.get("/recent-activity", ceoRecentActivity);
router.get("/module-stats", ceoModuleStats);

router.post("/create-employee", ceoCreateEmployee);
router.post("/create-project", ceoCreateProject);
router.post("/create-task", ceoCreateTask);
router.post("/create-ticket", ceoCreateTicket);
router.post("/create-super-admin", ceoCreateSuperAdmin);

export default router;
