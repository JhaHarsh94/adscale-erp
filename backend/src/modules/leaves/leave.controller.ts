import { Request, Response } from "express";
import {
  LeaveApprovalAction,
  LeaveDayType,
  LeaveStatus,
  type Prisma,
} from "@prisma/client";
import prisma from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { successResponse } from "../../utils/response";

const leaveRequestInclude: Prisma.LeaveRequestInclude = {
  employee: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      designation: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  leaveType: true,
  approvalLogs: {
    include: {
      approvedBy: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  },
};

function startOfDay(dateInput?: string | Date) {
  const date = dateInput ? new Date(dateInput) : new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getRequestUserId(req: Request) {
  return (
    (req as any).user?.id ||
    (req as any).userId ||
    (req as any).authUser?.id ||
    null
  );
}

async function getLoggedInEmployee(req: Request) {
  const userId = getRequestUserId(req);

  if (!userId) return null;

  return prisma.employee.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}

function calculateTotalLeaveDays(
  startDate: string,
  endDate: string,
  dayType: LeaveDayType
) {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  if (end < start) {
    throw new AppError("End date cannot be before start date", 400);
  }

  if (dayType === LeaveDayType.HALF_DAY) {
    return 0.5;
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  return diffDays;
}

async function findOrCreateBalance(
  employeeId: string,
  leaveTypeId: string,
  year: number,
  annualQuota = 0
) {
  const existingBalance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId,
        leaveTypeId,
        year,
      },
    },
  });

  if (existingBalance) return existingBalance;

  return prisma.leaveBalance.create({
    data: {
      employeeId,
      leaveTypeId,
      year,
      openingBalance: annualQuota,
      credited: annualQuota,
      used: 0,
      pending: 0,
      remaining: annualQuota,
    },
  });
}

/* =========================
   Leave Types
========================= */

export const getLeaveTypes = asyncHandler(async (req, res: Response) => {
  const leaveTypes = await prisma.leaveType.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return successResponse(
    res,
    200,
    "Leave types fetched successfully",
    leaveTypes
  );
});

export const createLeaveType = asyncHandler(async (req, res: Response) => {
  const { name, code, description, annualQuota, isPaid, requiresApproval } =
    req.body;

  if (!name || !code) {
    throw new AppError("Leave type name and code are required", 400);
  }

  const existingLeaveType = await prisma.leaveType.findFirst({
    where: {
      OR: [{ name: name.trim() }, { code: code.trim().toUpperCase() }],
    },
  });

  if (existingLeaveType) {
    throw new AppError("Leave type already exists", 409);
  }

  const leaveType = await prisma.leaveType.create({
    data: {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || null,
      annualQuota:
        annualQuota !== undefined && annualQuota !== null
          ? Number(annualQuota)
          : 0,
      isPaid: isPaid !== false,
      requiresApproval: requiresApproval !== false,
      isActive: true,
    },
  });

  return successResponse(
    res,
    201,
    "Leave type created successfully",
    leaveType
  );
});

/* =========================
   Leave Balances
========================= */

export const getLeaveBalances = asyncHandler(async (req, res: Response) => {
  const { employeeId, year } = req.query;

  const balances = await prisma.leaveBalance.findMany({
    where: {
      employeeId: employeeId ? String(employeeId) : undefined,
      year: year ? Number(year) : undefined,
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      leaveType: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return successResponse(
    res,
    200,
    "Leave balances fetched successfully",
    balances
  );
});

export const createOrUpdateLeaveBalance = asyncHandler(
  async (req, res: Response) => {
    const {
      employeeId,
      leaveTypeId,
      year,
      openingBalance,
      credited,
      used,
      pending,
      remaining,
    } = req.body;

    if (!employeeId || !leaveTypeId || !year) {
      throw new AppError("Employee ID, leave type ID and year are required", 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId },
    });

    if (!leaveType) {
      throw new AppError("Leave type not found", 404);
    }

    const finalOpening = Number(openingBalance || 0);
    const finalCredited = Number(credited ?? finalOpening);
    const finalUsed = Number(used || 0);
    const finalPending = Number(pending || 0);
    const finalRemaining =
      remaining !== undefined && remaining !== null
        ? Number(remaining)
        : finalCredited - finalUsed - finalPending;

    const balance = await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId,
          leaveTypeId,
          year: Number(year),
        },
      },
      update: {
        openingBalance: finalOpening,
        credited: finalCredited,
        used: finalUsed,
        pending: finalPending,
        remaining: finalRemaining,
      },
      create: {
        employeeId,
        leaveTypeId,
        year: Number(year),
        openingBalance: finalOpening,
        credited: finalCredited,
        used: finalUsed,
        pending: finalPending,
        remaining: finalRemaining,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        leaveType: true,
      },
    });

    return successResponse(
      res,
      200,
      "Leave balance saved successfully",
      balance
    );
  }
);

/* =========================
   Leave Requests
========================= */

export const applyLeave = asyncHandler(async (req, res: Response) => {
  const {
    employeeId,
    leaveTypeId,
    startDate,
    endDate,
    dayType,
    reason,
  } = req.body;

  if (!employeeId || !leaveTypeId || !startDate || !endDate) {
    throw new AppError(
      "Employee ID, leave type, start date and end date are required",
      400
    );
  }

  const finalDayType = (dayType as LeaveDayType) || LeaveDayType.FULL_DAY;

  if (!Object.values(LeaveDayType).includes(finalDayType)) {
    throw new AppError("Invalid leave day type", 400);
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  const leaveType = await prisma.leaveType.findUnique({
    where: { id: leaveTypeId },
  });

  if (!leaveType || !leaveType.isActive) {
    throw new AppError("Leave type not found or inactive", 404);
  }

  const totalDays = calculateTotalLeaveDays(startDate, endDate, finalDayType);
  const year = new Date(startDate).getFullYear();

  const balance = await findOrCreateBalance(
    employeeId,
    leaveTypeId,
    year,
    leaveType.annualQuota
  );

  if (balance.remaining < totalDays) {
    throw new AppError("Insufficient leave balance", 400);
  }

  const leaveRequest = await prisma.$transaction(async (tx) => {
    const request = await tx.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId,
        startDate: startOfDay(startDate),
        endDate: startOfDay(endDate),
        totalDays,
        dayType: finalDayType,
        reason: reason?.trim() || null,
        status: LeaveStatus.PENDING,
      },
    });

    await tx.leaveApprovalLog.create({
      data: {
        leaveRequestId: request.id,
        action: LeaveApprovalAction.APPLIED,
        remarks: "Leave request applied",
        approvedById: employeeId,
      },
    });

    await tx.leaveBalance.update({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId,
          leaveTypeId,
          year,
        },
      },
      data: {
        pending: balance.pending + totalDays,
        remaining: balance.remaining - totalDays,
      },
    });

    return tx.leaveRequest.findUnique({
      where: { id: request.id },
      include: leaveRequestInclude,
    });
  });

  return successResponse(
    res,
    201,
    "Leave request applied successfully",
    leaveRequest
  );
});

export const getLeaveRequests = asyncHandler(async (req, res: Response) => {
  const { employeeId, status, leaveTypeId } = req.query;

  const requests = await prisma.leaveRequest.findMany({
    where: {
      employeeId: employeeId ? String(employeeId) : undefined,
      leaveTypeId: leaveTypeId ? String(leaveTypeId) : undefined,
      status: status ? (status as LeaveStatus) : undefined,
    },
    include: leaveRequestInclude,
    orderBy: {
      createdAt: "desc",
    },
  });

  return successResponse(
    res,
    200,
    "Leave requests fetched successfully",
    requests
  );
});

export const getLeaveRequestById = asyncHandler(
  async (req, res: Response) => {
    const { id } = req.params;

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: leaveRequestInclude,
    });

    if (!request) {
      throw new AppError("Leave request not found", 404);
    }

    return successResponse(
      res,
      200,
      "Leave request fetched successfully",
      request
    );
  }
);

/* =========================
   Approvals
========================= */

export const teamLeadApproveLeave = asyncHandler(
  async (req, res: Response) => {
    const { id } = req.params;
    const { remarks, action } = req.body;

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new AppError("Leave request not found", 404);
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new AppError("Only pending leave can be reviewed by Team Lead", 400);
    }

    const approver = await getLoggedInEmployee(req);

    const isRejected = action === "REJECTED";

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: isRejected
            ? LeaveStatus.REJECTED
            : LeaveStatus.TEAM_LEAD_APPROVED,
          teamLeadRemarks: remarks || null,
          teamLeadApprovedAt: new Date(),
          rejectedReason: isRejected ? remarks || "Rejected by Team Lead" : null,
        },
      });

      await tx.leaveApprovalLog.create({
        data: {
          leaveRequestId: id,
          action: isRejected
            ? LeaveApprovalAction.REJECTED
            : LeaveApprovalAction.TEAM_LEAD_APPROVED,
          remarks: remarks || null,
          approvedById: approver?.id || null,
        },
      });

      if (isRejected) {
        const year = request.startDate.getFullYear();

        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year,
            },
          },
        });

        if (balance) {
          await tx.leaveBalance.update({
            where: {
              employeeId_leaveTypeId_year: {
                employeeId: request.employeeId,
                leaveTypeId: request.leaveTypeId,
                year,
              },
            },
            data: {
              pending: Math.max(balance.pending - request.totalDays, 0),
              remaining: balance.remaining + request.totalDays,
            },
          });
        }
      }

      return tx.leaveRequest.findUnique({
        where: { id: updated.id },
        include: leaveRequestInclude,
      });
    });

    return successResponse(
      res,
      200,
      isRejected
        ? "Leave request rejected by Team Lead"
        : "Leave request approved by Team Lead",
      updatedRequest
    );
  }
);

export const hrApproveLeave = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;
  const { remarks, action } = req.body;

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
  });

  if (!request) {
    throw new AppError("Leave request not found", 404);
  }

  if (request.status !== LeaveStatus.TEAM_LEAD_APPROVED) {
    throw new AppError("Leave must be Team Lead approved before HR approval", 400);
  }

  const approver = await getLoggedInEmployee(req);
  const isRejected = action === "REJECTED";

  const updatedRequest = await prisma.$transaction(async (tx) => {
    const updated = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: isRejected ? LeaveStatus.REJECTED : LeaveStatus.APPROVED,
        hrRemarks: remarks || null,
        hrApprovedAt: new Date(),
        rejectedReason: isRejected ? remarks || "Rejected by HR" : null,
      },
    });

    await tx.leaveApprovalLog.create({
      data: {
        leaveRequestId: id,
        action: isRejected
          ? LeaveApprovalAction.REJECTED
          : LeaveApprovalAction.APPROVED,
        remarks: remarks || null,
        approvedById: approver?.id || null,
      },
    });

    const year = request.startDate.getFullYear();

    const balance = await tx.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
      },
    });

    if (balance) {
      await tx.leaveBalance.update({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
        data: isRejected
          ? {
              pending: Math.max(balance.pending - request.totalDays, 0),
              remaining: balance.remaining + request.totalDays,
            }
          : {
              pending: Math.max(balance.pending - request.totalDays, 0),
              used: balance.used + request.totalDays,
            },
      });
    }

    return tx.leaveRequest.findUnique({
      where: { id: updated.id },
      include: leaveRequestInclude,
    });
  });

  return successResponse(
    res,
    200,
    isRejected ? "Leave request rejected by HR" : "Leave request approved by HR",
    updatedRequest
  );
});

export const cancelLeaveRequest = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;
  const { remarks } = req.body;

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
  });

  if (!request) {
    throw new AppError("Leave request not found", 404);
  }

  if (
    request.status === LeaveStatus.APPROVED ||
    request.status === LeaveStatus.REJECTED ||
    request.status === LeaveStatus.CANCELLED
  ) {
    throw new AppError("This leave request cannot be cancelled", 400);
  }

  const employee = await getLoggedInEmployee(req);
  const year = request.startDate.getFullYear();

  const updatedRequest = await prisma.$transaction(async (tx) => {
    const updated = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    await tx.leaveApprovalLog.create({
      data: {
        leaveRequestId: id,
        action: LeaveApprovalAction.CANCELLED,
        remarks: remarks || "Leave request cancelled",
        approvedById: employee?.id || null,
      },
    });

    const balance = await tx.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
      },
    });

    if (balance) {
      await tx.leaveBalance.update({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
        data: {
          pending: Math.max(balance.pending - request.totalDays, 0),
          remaining: balance.remaining + request.totalDays,
        },
      });
    }

    return tx.leaveRequest.findUnique({
      where: { id: updated.id },
      include: leaveRequestInclude,
    });
  });

  return successResponse(
    res,
    200,
    "Leave request cancelled successfully",
    updatedRequest
  );
});

/* =========================
   Dashboard
========================= */

export const getLeaveDashboard = asyncHandler(async (req, res: Response) => {
  const [
    totalLeaveTypes,
    totalLeaveRequests,
    pendingRequests,
    teamLeadApprovedRequests,
    approvedRequests,
    rejectedRequests,
    cancelledRequests,
  ] = await Promise.all([
    prisma.leaveType.count(),
    prisma.leaveRequest.count(),
    prisma.leaveRequest.count({ where: { status: LeaveStatus.PENDING } }),
    prisma.leaveRequest.count({
      where: { status: LeaveStatus.TEAM_LEAD_APPROVED },
    }),
    prisma.leaveRequest.count({ where: { status: LeaveStatus.APPROVED } }),
    prisma.leaveRequest.count({ where: { status: LeaveStatus.REJECTED } }),
    prisma.leaveRequest.count({ where: { status: LeaveStatus.CANCELLED } }),
  ]);

  return successResponse(res, 200, "Leave dashboard fetched successfully", {
    totalLeaveTypes,
    totalLeaveRequests,
    pendingRequests,
    teamLeadApprovedRequests,
    approvedRequests,
    rejectedRequests,
    cancelledRequests,
  });
});