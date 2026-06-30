"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const leave_controller_1 = require("./leave.controller");
const router = (0, express_1.Router)();
const leaveAdminRoles = ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"];
const approvalRoles = ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER", "TEAM_LEAD"];
/* Dashboard */
router.get("/dashboard", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...leaveAdminRoles), leave_controller_1.getLeaveDashboard);
/* Leave Types */
router.get("/types", auth_middleware_1.protect, leave_controller_1.getLeaveTypes);
router.post("/types", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...leaveAdminRoles), leave_controller_1.createLeaveType);
/* Leave Balances */
router.get("/balances", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...leaveAdminRoles), leave_controller_1.getLeaveBalances);
router.post("/balances", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...leaveAdminRoles), leave_controller_1.createOrUpdateLeaveBalance);
/* Leave Requests */
router.get("/requests", auth_middleware_1.protect, leave_controller_1.getLeaveRequests);
router.post("/requests", auth_middleware_1.protect, leave_controller_1.applyLeave);
router.get("/requests/:id", auth_middleware_1.protect, leave_controller_1.getLeaveRequestById);
router.put("/requests/:id/team-lead-approval", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...approvalRoles), leave_controller_1.teamLeadApproveLeave);
router.put("/requests/:id/hr-approval", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)("SUPER_ADMIN", "DIRECTOR", "HR"), leave_controller_1.hrApproveLeave);
router.put("/requests/:id/cancel", auth_middleware_1.protect, leave_controller_1.cancelLeaveRequest);
exports.default = router;
