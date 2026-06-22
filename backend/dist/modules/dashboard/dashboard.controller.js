"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientDashboard = exports.employeeDashboard = exports.teamLeadDashboard = exports.operationsDashboard = exports.hrDashboard = exports.directorDashboard = exports.superAdminDashboard = void 0;
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
exports.superAdminDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    return (0, response_1.successResponse)(res, 200, "Super Admin dashboard access granted", {
        user: req.user,
        access: [
            "Full System Access",
            "User Management",
            "Role Management",
            "Department Management",
            "Employee Management",
            "Company Reports",
        ],
    });
});
exports.directorDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    return (0, response_1.successResponse)(res, 200, "Director dashboard access granted", {
        user: req.user,
        access: [
            "Company Dashboard",
            "Reports",
            "Finance Overview",
            "Department Performance",
        ],
    });
});
exports.hrDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    return (0, response_1.successResponse)(res, 200, "HR dashboard access granted", {
        user: req.user,
        access: [
            "Employee Management",
            "Attendance",
            "Leave Management",
            "Recruitment",
        ],
    });
});
exports.operationsDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    return (0, response_1.successResponse)(res, 200, "Operations dashboard access granted", {
        user: req.user,
        access: [
            "Projects",
            "Tasks",
            "Tickets",
            "Approvals",
            "Team Worklogs",
        ],
    });
});
exports.teamLeadDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    return (0, response_1.successResponse)(res, 200, "Team Lead dashboard access granted", {
        user: req.user,
        access: [
            "Assigned Team",
            "Task Assignment",
            "Ticket Review",
            "Worklog Review",
        ],
    });
});
exports.employeeDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    return (0, response_1.successResponse)(res, 200, "Employee dashboard access granted", {
        user: req.user,
        access: [
            "My Tasks",
            "My Attendance",
            "My Leaves",
            "My Worklogs",
        ],
    });
});
exports.clientDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    return (0, response_1.successResponse)(res, 200, "Client dashboard access granted", {
        user: req.user,
        access: [
            "My Projects",
            "My Tickets",
            "My Files",
            "My Reports",
            "Approvals",
        ],
    });
});
