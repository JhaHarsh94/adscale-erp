import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  getTeamById,
  getTeamMembers,
  getTeams,
  removeTeamMember,
  updateTeam,
  updateTeamMemberRole,
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

router.get("/:id/members", protect, getTeamMembers);

router.post(
  "/:id/members",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR"),
  addTeamMember
);

router.put(
  "/:id/members/:employeeId",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR"),
  updateTeamMemberRole
);

router.delete(
  "/:id/members/:employeeId",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR"),
  removeTeamMember
);

export default router;