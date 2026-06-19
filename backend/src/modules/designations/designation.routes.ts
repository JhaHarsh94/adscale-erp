import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  createDesignation,
  deleteDesignation,
  getDesignationById,
  getDesignations,
  updateDesignation,
} from "./designation.controller";

const router = Router();

router.get("/", protect, getDesignations);
router.get("/:id", protect, getDesignationById);

router.post(
  "/",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "HR"),
  createDesignation
);

router.put(
  "/:id",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "HR"),
  updateDesignation
);

router.delete(
  "/:id",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR"),
  deleteDesignation
);

export default router;