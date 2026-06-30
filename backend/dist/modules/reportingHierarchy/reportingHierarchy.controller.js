"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReportingHierarchy = exports.updateReportingHierarchy = exports.createReportingHierarchy = exports.getReportingHierarchyById = exports.getReportingHierarchy = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const asyncHandler_1 = require("../../utils/asyncHandler");
const AppError_1 = require("../../utils/AppError");
const response_1 = require("../../utils/response");
const employeeInclude = {
    user: {
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
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
};
exports.getReportingHierarchy = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const hierarchy = await prisma_1.default.reportingHierarchy.findMany({
        include: {
            employee: {
                include: employeeInclude,
            },
            reportsTo: {
                include: employeeInclude,
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    return (0, response_1.successResponse)(res, 200, "Reporting hierarchy fetched successfully", hierarchy);
});
exports.getReportingHierarchyById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const hierarchy = await prisma_1.default.reportingHierarchy.findUnique({
        where: { id },
        include: {
            employee: {
                include: employeeInclude,
            },
            reportsTo: {
                include: employeeInclude,
            },
        },
    });
    if (!hierarchy) {
        throw new AppError_1.AppError("Reporting hierarchy record not found", 404);
    }
    return (0, response_1.successResponse)(res, 200, "Reporting hierarchy record fetched successfully", hierarchy);
});
exports.createReportingHierarchy = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { employeeId, reportsToId } = req.body;
    if (!employeeId) {
        throw new AppError_1.AppError("Employee ID is required", 400);
    }
    if (reportsToId && employeeId === reportsToId) {
        throw new AppError_1.AppError("Employee cannot report to themselves", 400);
    }
    const employee = await prisma_1.default.employee.findUnique({
        where: { id: employeeId },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    if (reportsToId) {
        const manager = await prisma_1.default.employee.findUnique({
            where: { id: reportsToId },
        });
        if (!manager) {
            throw new AppError_1.AppError("Reporting manager not found", 404);
        }
    }
    const existingHierarchy = await prisma_1.default.reportingHierarchy.findUnique({
        where: { employeeId },
    });
    if (existingHierarchy) {
        throw new AppError_1.AppError("Reporting hierarchy already exists for this employee", 409);
    }
    const hierarchy = await prisma_1.default.reportingHierarchy.create({
        data: {
            employeeId,
            reportsToId: reportsToId || null,
        },
        include: {
            employee: {
                include: employeeInclude,
            },
            reportsTo: {
                include: employeeInclude,
            },
        },
    });
    return (0, response_1.successResponse)(res, 201, "Reporting hierarchy created successfully", hierarchy);
});
exports.updateReportingHierarchy = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { reportsToId } = req.body;
    const hierarchy = await prisma_1.default.reportingHierarchy.findUnique({
        where: { id },
    });
    if (!hierarchy) {
        throw new AppError_1.AppError("Reporting hierarchy record not found", 404);
    }
    if (reportsToId && hierarchy.employeeId === reportsToId) {
        throw new AppError_1.AppError("Employee cannot report to themselves", 400);
    }
    if (reportsToId) {
        const manager = await prisma_1.default.employee.findUnique({
            where: { id: reportsToId },
        });
        if (!manager) {
            throw new AppError_1.AppError("Reporting manager not found", 404);
        }
    }
    const updatedHierarchy = await prisma_1.default.reportingHierarchy.update({
        where: { id },
        data: {
            reportsToId: reportsToId || null,
        },
        include: {
            employee: {
                include: employeeInclude,
            },
            reportsTo: {
                include: employeeInclude,
            },
        },
    });
    return (0, response_1.successResponse)(res, 200, "Reporting hierarchy updated successfully", updatedHierarchy);
});
exports.deleteReportingHierarchy = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const hierarchy = await prisma_1.default.reportingHierarchy.findUnique({
        where: { id },
    });
    if (!hierarchy) {
        throw new AppError_1.AppError("Reporting hierarchy record not found", 404);
    }
    await prisma_1.default.reportingHierarchy.delete({
        where: { id },
    });
    return (0, response_1.successResponse)(res, 200, "Reporting hierarchy deleted successfully");
});
