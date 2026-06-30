import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  clientDashboard,
  directorDashboard,
  employeeDashboard,
  hrDashboard,
  operationsDashboard,
  superAdminDashboard,
  teamLeadDashboard,
} from "./dashboard.controller";

const router = Router();

router.get(
  "/super-admin",
  protect,
  allowRoles("SUPER_ADMIN"),
  superAdminDashboard
);

router.get(
  "/director",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR"),
  directorDashboard
);

router.get(
  "/hr",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "HR"),
  hrDashboard
);

router.get(
  "/operations",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"),
  operationsDashboard
);

router.get(
  "/team-lead",
  protect,
  allowRoles("SUPER_ADMIN", "OPERATIONS_MANAGER", "TEAM_LEAD"),
  teamLeadDashboard
);

router.get(
  "/employee",
  protect,
  allowRoles("SUPER_ADMIN", "OPERATIONS_MANAGER", "TEAM_LEAD", "EMPLOYEE"),
  employeeDashboard
);

router.get(
  "/client",
  protect,
  allowRoles("SUPER_ADMIN", "CLIENT"),
  clientDashboard
);

export default router;