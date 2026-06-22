"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeaveDashboard = exports.cancelLeaveRequest = exports.hrApproveLeave = exports.teamLeadApproveLeave = exports.getLeaveRequestById = exports.getLeaveRequests = exports.applyLeave = exports.createOrUpdateLeaveBalance = exports.getLeaveBalances = exports.createLeaveType = exports.getLeaveTypes = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const asyncHandler_1 = require("../../utils/asyncHandler");
const AppError_1 = require("../../utils/AppError");
const response_1 = require("../../utils/response");
const leaveRequestInclude = {
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
function startOfDay(dateInput) {
    const date = dateInput ? new Date(dateInput) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function getRequestUserId(req) {
    return (req.user?.id ||
        req.userId ||
        req.authUser?.id ||
        null);
}
async function getLoggedInEmployee(req) {
    const userId = getRequestUserId(req);
    if (!userId)
        return null;
    return prisma_1.default.employee.findUnique({
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
function calculateTotalLeaveDays(startDate, endDate, dayType) {
    const start = startOfDay(startDate);
    const end = startOfDay(endDate);
    if (end < start) {
        throw new AppError_1.AppError("End date cannot be before start date", 400);
    }
    if (dayType === client_1.LeaveDayType.HALF_DAY) {
        return 0.5;
    }
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
}
async function findOrCreateBalance(employeeId, leaveTypeId, year, annualQuota = 0) {
    const existingBalance = await prisma_1.default.leaveBalance.findUnique({
        where: {
            employeeId_leaveTypeId_year: {
                employeeId,
                leaveTypeId,
                year,
            },
        },
    });
    if (existingBalance)
        return existingBalance;
    return prisma_1.default.leaveBalance.create({
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
exports.getLeaveTypes = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const leaveTypes = await prisma_1.default.leaveType.findMany({
        orderBy: {
            name: "asc",
        },
    });
    return (0, response_1.successResponse)(res, 200, "Leave types fetched successfully", leaveTypes);
});
exports.createLeaveType = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, code, description, annualQuota, isPaid, requiresApproval } = req.body;
    if (!name || !code) {
        throw new AppError_1.AppError("Leave type name and code are required", 400);
    }
    const existingLeaveType = await prisma_1.default.leaveType.findFirst({
        where: {
            OR: [{ name: name.trim() }, { code: code.trim().toUpperCase() }],
        },
    });
    if (existingLeaveType) {
        throw new AppError_1.AppError("Leave type already exists", 409);
    }
    const leaveType = await prisma_1.default.leaveType.create({
        data: {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description?.trim() || null,
            annualQuota: annualQuota !== undefined && annualQuota !== null
                ? Number(annualQuota)
                : 0,
            isPaid: isPaid !== false,
            requiresApproval: requiresApproval !== false,
            isActive: true,
        },
    });
    return (0, response_1.successResponse)(res, 201, "Leave type created successfully", leaveType);
});
/* =========================
   Leave Balances
========================= */
exports.getLeaveBalances = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { employeeId, year } = req.query;
    const balances = await prisma_1.default.leaveBalance.findMany({
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
    return (0, response_1.successResponse)(res, 200, "Leave balances fetched successfully", balances);
});
exports.createOrUpdateLeaveBalance = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { employeeId, leaveTypeId, year, openingBalance, credited, used, pending, remaining, } = req.body;
    if (!employeeId || !leaveTypeId || !year) {
        throw new AppError_1.AppError("Employee ID, leave type ID and year are required", 400);
    }
    const employee = await prisma_1.default.employee.findUnique({
        where: { id: employeeId },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    const leaveType = await prisma_1.default.leaveType.findUnique({
        where: { id: leaveTypeId },
    });
    if (!leaveType) {
        throw new AppError_1.AppError("Leave type not found", 404);
    }
    const finalOpening = Number(openingBalance || 0);
    const finalCredited = Number(credited ?? finalOpening);
    const finalUsed = Number(used || 0);
    const finalPending = Number(pending || 0);
    const finalRemaining = remaining !== undefined && remaining !== null
        ? Number(remaining)
        : finalCredited - finalUsed - finalPending;
    const balance = await prisma_1.default.leaveBalance.upsert({
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
    return (0, response_1.successResponse)(res, 200, "Leave balance saved successfully", balance);
});
/* =========================
   Leave Requests
========================= */
exports.applyLeave = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { employeeId, leaveTypeId, startDate, endDate, dayType, reason, } = req.body;
    if (!employeeId || !leaveTypeId || !startDate || !endDate) {
        throw new AppError_1.AppError("Employee ID, leave type, start date and end date are required", 400);
    }
    const finalDayType = dayType || client_1.LeaveDayType.FULL_DAY;
    if (!Object.values(client_1.LeaveDayType).includes(finalDayType)) {
        throw new AppError_1.AppError("Invalid leave day type", 400);
    }
    const employee = await prisma_1.default.employee.findUnique({
        where: { id: employeeId },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    const leaveType = await prisma_1.default.leaveType.findUnique({
        where: { id: leaveTypeId },
    });
    if (!leaveType || !leaveType.isActive) {
        throw new AppError_1.AppError("Leave type not found or inactive", 404);
    }
    const totalDays = calculateTotalLeaveDays(startDate, endDate, finalDayType);
    const year = new Date(startDate).getFullYear();
    const balance = await findOrCreateBalance(employeeId, leaveTypeId, year, leaveType.annualQuota);
    if (balance.remaining < totalDays) {
        throw new AppError_1.AppError("Insufficient leave balance", 400);
    }
    const leaveRequest = await prisma_1.default.$transaction(async (tx) => {
        const request = await tx.leaveRequest.create({
            data: {
                employeeId,
                leaveTypeId,
                startDate: startOfDay(startDate),
                endDate: startOfDay(endDate),
                totalDays,
                dayType: finalDayType,
                reason: reason?.trim() || null,
                status: client_1.LeaveStatus.PENDING,
            },
        });
        await tx.leaveApprovalLog.create({
            data: {
                leaveRequestId: request.id,
                action: client_1.LeaveApprovalAction.APPLIED,
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
    return (0, response_1.successResponse)(res, 201, "Leave request applied successfully", leaveRequest);
});
exports.getLeaveRequests = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { employeeId, status, leaveTypeId } = req.query;
    const requests = await prisma_1.default.leaveRequest.findMany({
        where: {
            employeeId: employeeId ? String(employeeId) : undefined,
            leaveTypeId: leaveTypeId ? String(leaveTypeId) : undefined,
            status: status ? status : undefined,
        },
        include: leaveRequestInclude,
        orderBy: {
            createdAt: "desc",
        },
    });
    return (0, response_1.successResponse)(res, 200, "Leave requests fetched successfully", requests);
});
exports.getLeaveRequestById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const request = await prisma_1.default.leaveRequest.findUnique({
        where: { id },
        include: leaveRequestInclude,
    });
    if (!request) {
        throw new AppError_1.AppError("Leave request not found", 404);
    }
    return (0, response_1.successResponse)(res, 200, "Leave request fetched successfully", request);
});
/* =========================
   Approvals
========================= */
exports.teamLeadApproveLeave = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { remarks, action } = req.body;
    const request = await prisma_1.default.leaveRequest.findUnique({
        where: { id },
    });
    if (!request) {
        throw new AppError_1.AppError("Leave request not found", 404);
    }
    if (request.status !== client_1.LeaveStatus.PENDING) {
        throw new AppError_1.AppError("Only pending leave can be reviewed by Team Lead", 400);
    }
    const approver = await getLoggedInEmployee(req);
    const isRejected = action === "REJECTED";
    const updatedRequest = await prisma_1.default.$transaction(async (tx) => {
        const updated = await tx.leaveRequest.update({
            where: { id },
            data: {
                status: isRejected
                    ? client_1.LeaveStatus.REJECTED
                    : client_1.LeaveStatus.TEAM_LEAD_APPROVED,
                teamLeadRemarks: remarks || null,
                teamLeadApprovedAt: new Date(),
                rejectedReason: isRejected ? remarks || "Rejected by Team Lead" : null,
            },
        });
        await tx.leaveApprovalLog.create({
            data: {
                leaveRequestId: id,
                action: isRejected
                    ? client_1.LeaveApprovalAction.REJECTED
                    : client_1.LeaveApprovalAction.TEAM_LEAD_APPROVED,
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
    return (0, response_1.successResponse)(res, 200, isRejected
        ? "Leave request rejected by Team Lead"
        : "Leave request approved by Team Lead", updatedRequest);
});
exports.hrApproveLeave = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { remarks, action } = req.body;
    const request = await prisma_1.default.leaveRequest.findUnique({
        where: { id },
    });
    if (!request) {
        throw new AppError_1.AppError("Leave request not found", 404);
    }
    if (request.status !== client_1.LeaveStatus.TEAM_LEAD_APPROVED) {
        throw new AppError_1.AppError("Leave must be Team Lead approved before HR approval", 400);
    }
    const approver = await getLoggedInEmployee(req);
    const isRejected = action === "REJECTED";
    const updatedRequest = await prisma_1.default.$transaction(async (tx) => {
        const updated = await tx.leaveRequest.update({
            where: { id },
            data: {
                status: isRejected ? client_1.LeaveStatus.REJECTED : client_1.LeaveStatus.APPROVED,
                hrRemarks: remarks || null,
                hrApprovedAt: new Date(),
                rejectedReason: isRejected ? remarks || "Rejected by HR" : null,
            },
        });
        await tx.leaveApprovalLog.create({
            data: {
                leaveRequestId: id,
                action: isRejected
                    ? client_1.LeaveApprovalAction.REJECTED
                    : client_1.LeaveApprovalAction.APPROVED,
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
    return (0, response_1.successResponse)(res, 200, isRejected ? "Leave request rejected by HR" : "Leave request approved by HR", updatedRequest);
});
exports.cancelLeaveRequest = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { remarks } = req.body;
    const request = await prisma_1.default.leaveRequest.findUnique({
        where: { id },
    });
    if (!request) {
        throw new AppError_1.AppError("Leave request not found", 404);
    }
    if (request.status === client_1.LeaveStatus.APPROVED ||
        request.status === client_1.LeaveStatus.REJECTED ||
        request.status === client_1.LeaveStatus.CANCELLED) {
        throw new AppError_1.AppError("This leave request cannot be cancelled", 400);
    }
    const employee = await getLoggedInEmployee(req);
    const year = request.startDate.getFullYear();
    const updatedRequest = await prisma_1.default.$transaction(async (tx) => {
        const updated = await tx.leaveRequest.update({
            where: { id },
            data: {
                status: client_1.LeaveStatus.CANCELLED,
                cancelledAt: new Date(),
            },
        });
        await tx.leaveApprovalLog.create({
            data: {
                leaveRequestId: id,
                action: client_1.LeaveApprovalAction.CANCELLED,
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
    return (0, response_1.successResponse)(res, 200, "Leave request cancelled successfully", updatedRequest);
});
/* =========================
   Dashboard
========================= */
exports.getLeaveDashboard = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const [totalLeaveTypes, totalLeaveRequests, pendingRequests, teamLeadApprovedRequests, approvedRequests, rejectedRequests, cancelledRequests,] = await Promise.all([
        prisma_1.default.leaveType.count(),
        prisma_1.default.leaveRequest.count(),
        prisma_1.default.leaveRequest.count({ where: { status: client_1.LeaveStatus.PENDING } }),
        prisma_1.default.leaveRequest.count({
            where: { status: client_1.LeaveStatus.TEAM_LEAD_APPROVED },
        }),
        prisma_1.default.leaveRequest.count({ where: { status: client_1.LeaveStatus.APPROVED } }),
        prisma_1.default.leaveRequest.count({ where: { status: client_1.LeaveStatus.REJECTED } }),
        prisma_1.default.leaveRequest.count({ where: { status: client_1.LeaveStatus.CANCELLED } }),
    ]);
    return (0, response_1.successResponse)(res, 200, "Leave dashboard fetched successfully", {
        totalLeaveTypes,
        totalLeaveRequests,
        pendingRequests,
        teamLeadApprovedRequests,
        approvedRequests,
        rejectedRequests,
        cancelledRequests,
    });
});
