import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  applyLeave,
  cancelLeaveRequest,
  createLeaveType,
  createOrUpdateLeaveBalance,
  getLeaveBalances,
  getLeaveDashboard,
  getLeaveRequestById,
  getLeaveRequests,
  getLeaveTypes,
  hrApproveLeave,
  teamLeadApproveLeave,
} from "./leave.controller";

const router = Router();

const leaveAdminRoles = ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"];
const approvalRoles = ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER", "TEAM_LEAD"];

/* Dashboard */
router.get(
  "/dashboard",
  protect,
  allowRoles(...leaveAdminRoles),
  getLeaveDashboard
);

/* Leave Types */
router.get("/types", protect, getLeaveTypes);

router.post(
  "/types",
  protect,
  allowRoles(...leaveAdminRoles),
  createLeaveType
);

/* Leave Balances */
router.get(
  "/balances",
  protect,
  allowRoles(...leaveAdminRoles),
  getLeaveBalances
);

router.post(
  "/balances",
  protect,
  allowRoles(...leaveAdminRoles),
  createOrUpdateLeaveBalance
);

/* Leave Requests */
router.get("/requests", protect, getLeaveRequests);
router.post("/requests", protect, applyLeave);
router.get("/requests/:id", protect, getLeaveRequestById);

router.put(
  "/requests/:id/team-lead-approval",
  protect,
  allowRoles(...approvalRoles),
  teamLeadApproveLeave
);

router.put(
  "/requests/:id/hr-approval",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "HR"),
  hrApproveLeave
);

router.put("/requests/:id/cancel", protect, cancelLeaveRequest);

export default router;