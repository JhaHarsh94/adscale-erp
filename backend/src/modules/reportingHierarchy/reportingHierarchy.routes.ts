import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  createReportingHierarchy,
  deleteReportingHierarchy,
  getReportingHierarchy,
  getReportingHierarchyById,
  updateReportingHierarchy,
} from "./reportingHierarchy.controller";

const router = Router();

router.get("/", protect, getReportingHierarchy);
router.get("/:id", protect, getReportingHierarchyById);

router.post(
  "/",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"),
  createReportingHierarchy
);

router.put(
  "/:id",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"),
  updateReportingHierarchy
);

router.delete(
  "/:id",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "HR"),
  deleteReportingHierarchy
);

export default router;