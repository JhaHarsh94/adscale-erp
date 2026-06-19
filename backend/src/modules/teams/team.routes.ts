import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  createTeam,
  deleteTeam,
  getTeamById,
  getTeams,
  updateTeam,
} from "./team.controller";

const router = Router();

router.get("/", protect, getTeams);
router.get("/:id", protect, getTeamById);

router.post(
  "/",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR"),
  createTeam
);

router.put(
  "/:id",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR"),
  updateTeam
);

router.delete(
  "/:id",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"),
  deleteTeam
);

export default router;