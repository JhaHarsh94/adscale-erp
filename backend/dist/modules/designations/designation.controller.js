"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDesignation = exports.updateDesignation = exports.createDesignation = exports.getDesignationById = exports.getDesignations = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const asyncHandler_1 = require("../../utils/asyncHandler");
const AppError_1 = require("../../utils/AppError");
const response_1 = require("../../utils/response");
exports.getDesignations = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const designations = await prisma_1.default.designation.findMany({
        orderBy: {
            name: "asc",
        },
        include: {
            department: {
                select: {
                    id: true,
                    name: true,
                },
            },
            _count: {
                select: {
                    employees: true,
                },
            },
        },
    });
    return (0, response_1.successResponse)(res, 200, "Designations fetched successfully", designations);
});
exports.getDesignationById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const designation = await prisma_1.default.designation.findUnique({
        where: { id },
        include: {
            department: {
                select: {
                    id: true,
                    name: true,
                },
            },
            employees: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            status: true,
                        },
                    },
                },
            },
            _count: {
                select: {
                    employees: true,
                },
            },
        },
    });
    if (!designation) {
        throw new AppError_1.AppError("Designation not found", 404);
    }
    return (0, response_1.successResponse)(res, 200, "Designation fetched successfully", designation);
});
exports.createDesignation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, description, departmentId } = req.body;
    if (!name || !name.trim()) {
        throw new AppError_1.AppError("Designation name is required", 400);
    }
    const normalizedName = name.trim();
    if (departmentId) {
        const department = await prisma_1.default.department.findUnique({
            where: { id: departmentId },
        });
        if (!department) {
            throw new AppError_1.AppError("Department not found", 404);
        }
    }
    const existingDesignation = await prisma_1.default.designation.findFirst({
        where: {
            name: normalizedName,
            departmentId: departmentId || null,
        },
    });
    if (existingDesignation) {
        throw new AppError_1.AppError("Designation already exists in this department", 409);
    }
    const designation = await prisma_1.default.designation.create({
        data: {
            name: normalizedName,
            description: description?.trim() || null,
            departmentId: departmentId || null,
        },
        include: {
            department: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
    return (0, response_1.successResponse)(res, 201, "Designation created successfully", designation);
});
exports.updateDesignation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { name, description, departmentId } = req.body;
    const designation = await prisma_1.default.designation.findUnique({
        where: { id },
    });
    if (!designation) {
        throw new AppError_1.AppError("Designation not found", 404);
    }
    if (departmentId) {
        const department = await prisma_1.default.department.findUnique({
            where: { id: departmentId },
        });
        if (!department) {
            throw new AppError_1.AppError("Department not found", 404);
        }
    }
    const newName = name?.trim() || designation.name;
    const newDepartmentId = departmentId !== undefined ? departmentId || null : designation.departmentId;
    const existingDesignation = await prisma_1.default.designation.findFirst({
        where: {
            name: newName,
            departmentId: newDepartmentId,
            NOT: {
                id,
            },
        },
    });
    if (existingDesignation) {
        throw new AppError_1.AppError("Another designation already exists with this name in this department", 409);
    }
    const updatedDesignation = await prisma_1.default.designation.update({
        where: { id },
        data: {
            name: newName,
            description: description !== undefined
                ? description?.trim() || null
                : designation.description,
            departmentId: newDepartmentId,
        },
        include: {
            department: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
    return (0, response_1.successResponse)(res, 200, "Designation updated successfully", updatedDesignation);
});
exports.deleteDesignation = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const designation = await prisma_1.default.designation.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    employees: true,
                },
            },
        },
    });
    if (!designation) {
        throw new AppError_1.AppError("Designation not found", 404);
    }
    if (designation._count.employees > 0) {
        throw new AppError_1.AppError("Cannot delete designation because employees are assigned to it", 400);
    }
    await prisma_1.default.designation.delete({
        where: { id },
    });
    return (0, response_1.successResponse)(res, 200, "Designation deleted successfully");
});
