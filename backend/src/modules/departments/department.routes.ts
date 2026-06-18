import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  createDepartment,
  deleteDepartment,
  getDepartmentById,
  getDepartments,
  updateDepartment,
} from "./department.controller";

const router = Router();

router.get("/", protect, getDepartments);
router.get("/:id", protect, getDepartmentById);

router.post(
  "/",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR"),
  createDepartment
);

router.put(
  "/:id",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR"),
  updateDepartment
);

router.delete("/:id", protect, allowRoles("SUPER_ADMIN"), deleteDepartment);

export default router;