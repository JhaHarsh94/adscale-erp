"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.createDepartment = exports.getDepartmentById = exports.getDepartments = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const asyncHandler_1 = require("../../utils/asyncHandler");
const AppError_1 = require("../../utils/AppError");
const response_1 = require("../../utils/response");
exports.getDepartments = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const departments = await prisma_1.default.department.findMany({
        orderBy: {
            name: "asc",
        },
        include: {
            _count: {
                select: {
                    employees: true,
                },
            },
        },
    });
    return (0, response_1.successResponse)(res, 200, "Departments fetched successfully", departments);
});
exports.getDepartmentById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const department = await prisma_1.default.department.findUnique({
        where: {
            id,
        },
        include: {
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
    if (!department) {
        throw new AppError_1.AppError("Department not found", 404);
    }
    return (0, response_1.successResponse)(res, 200, "Department fetched successfully", department);
});
exports.createDepartment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
        throw new AppError_1.AppError("Department name is required", 400);
    }
    const normalizedName = name.trim();
    const existingDepartment = await prisma_1.default.department.findUnique({
        where: {
            name: normalizedName,
        },
    });
    if (existingDepartment) {
        throw new AppError_1.AppError("Department already exists", 409);
    }
    const department = await prisma_1.default.department.create({
        data: {
            name: normalizedName,
            description: description?.trim() || null,
        },
    });
    return (0, response_1.successResponse)(res, 201, "Department created successfully", department);
});
exports.updateDepartment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const department = await prisma_1.default.department.findUnique({
        where: {
            id,
        },
    });
    if (!department) {
        throw new AppError_1.AppError("Department not found", 404);
    }
    if (name && name.trim() !== department.name) {
        const existingDepartment = await prisma_1.default.department.findUnique({
            where: {
                name: name.trim(),
            },
        });
        if (existingDepartment) {
            throw new AppError_1.AppError("Another department already exists with this name", 409);
        }
    }
    const updatedDepartment = await prisma_1.default.department.update({
        where: {
            id,
        },
        data: {
            name: name?.trim() || department.name,
            description: description !== undefined ? description?.trim() || null : department.description,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Department updated successfully", updatedDepartment);
});
exports.deleteDepartment = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const department = await prisma_1.default.department.findUnique({
        where: {
            id,
        },
        include: {
            _count: {
                select: {
                    employees: true,
                },
            },
        },
    });
    if (!department) {
        throw new AppError_1.AppError("Department not found", 404);
    }
    if (department._count.employees > 0) {
        throw new AppError_1.AppError("Cannot delete department because employees are assigned to it", 400);
    }
    await prisma_1.default.department.delete({
        where: {
            id,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Department deleted successfully");
});
