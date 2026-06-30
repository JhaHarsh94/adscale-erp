import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";

export const superAdminDashboard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    return successResponse(res, 200, "Super Admin dashboard access granted", {
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
  }
);

export const directorDashboard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    return successResponse(res, 200, "Director dashboard access granted", {
      user: req.user,
      access: [
        "Company Dashboard",
        "Reports",
        "Finance Overview",
        "Department Performance",
      ],
    });
  }
);

export const hrDashboard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    return successResponse(res, 200, "HR dashboard access granted", {
      user: req.user,
      access: [
        "Employee Management",
        "Attendance",
        "Leave Management",
        "Recruitment",
      ],
    });
  }
);

export const operationsDashboard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    return successResponse(res, 200, "Operations dashboard access granted", {
      user: req.user,
      access: [
        "Projects",
        "Tasks",
        "Tickets",
        "Approvals",
        "Team Worklogs",
      ],
    });
  }
);

export const teamLeadDashboard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    return successResponse(res, 200, "Team Lead dashboard access granted", {
      user: req.user,
      access: [
        "Assigned Team",
        "Task Assignment",
        "Ticket Review",
        "Worklog Review",
      ],
    });
  }
);

export const employeeDashboard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    return successResponse(res, 200, "Employee dashboard access granted", {
      user: req.user,
      access: [
        "My Tasks",
        "My Attendance",
        "My Leaves",
        "My Worklogs",
      ],
    });
  }
);

export const clientDashboard = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    return successResponse(res, 200, "Client dashboard access granted", {
      user: req.user,
      access: [
        "My Projects",
        "My Tickets",
        "My Files",
        "My Reports",
        "Approvals",
      ],
    });
  }
);