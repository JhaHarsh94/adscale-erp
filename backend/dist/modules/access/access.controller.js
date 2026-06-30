"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePermission = exports.updatePermission = exports.createPermission = exports.getPermissions = exports.setRolePermissions = exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoles = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const asyncHandler_1 = require("../../utils/asyncHandler");
const AppError_1 = require("../../utils/AppError");
const response_1 = require("../../utils/response");
const normalizeCode = (value) => String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
const roleInclude = {
    rolePermissions: {
        include: { permission: true },
        orderBy: { permission: { name: "asc" } },
    },
    _count: { select: { users: true } },
};
exports.getRoles = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const roles = await prisma_1.default.role.findMany({
        include: roleInclude,
        orderBy: { name: "asc" },
    });
    return (0, response_1.successResponse)(res, 200, "Roles fetched successfully", roles.map(({ rolePermissions, _count, ...role }) => ({
        ...role,
        permissions: rolePermissions.map((item) => item.permission),
        userCount: _count.users,
    })));
});
exports.createRole = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const name = normalizeCode(req.body.name);
    const description = String(req.body.description || "").trim() || null;
    if (!name) {
        throw new AppError_1.AppError("Role name is required", 400);
    }
    const existingRole = await prisma_1.default.role.findUnique({ where: { name } });
    if (existingRole) {
        throw new AppError_1.AppError("A role with this name already exists", 409);
    }
    const role = await prisma_1.default.role.create({
        data: { name, description },
    });
    return (0, response_1.successResponse)(res, 201, "Role created successfully", role);
});
exports.updateRole = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existingRole = await prisma_1.default.role.findUnique({
        where: { id: req.params.id },
    });
    if (!existingRole) {
        throw new AppError_1.AppError("Role not found", 404);
    }
    const name = req.body.name ? normalizeCode(req.body.name) : existingRole.name;
    if (!name) {
        throw new AppError_1.AppError("Role name is required", 400);
    }
    const role = await prisma_1.default.role.update({
        where: { id: existingRole.id },
        data: {
            name,
            description: req.body.description === undefined
                ? existingRole.description
                : String(req.body.description || "").trim() || null,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Role updated successfully", role);
});
exports.deleteRole = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const role = await prisma_1.default.role.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { users: true } } },
    });
    if (!role) {
        throw new AppError_1.AppError("Role not found", 404);
    }
    if (role.name === "SUPER_ADMIN") {
        throw new AppError_1.AppError("The SUPER_ADMIN role cannot be deleted", 400);
    }
    if (role._count.users > 0) {
        throw new AppError_1.AppError("Reassign users before deleting this role", 409);
    }
    await prisma_1.default.role.delete({ where: { id: role.id } });
    return (0, response_1.successResponse)(res, 200, "Role deleted successfully");
});
exports.setRolePermissions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const permissionIds = Array.isArray(req.body.permissionIds)
        ? [
            ...new Set(req.body.permissionIds.map((value) => String(value))),
        ]
        : null;
    if (!permissionIds) {
        throw new AppError_1.AppError("permissionIds must be an array", 400);
    }
    const role = await prisma_1.default.role.findUnique({ where: { id: req.params.id } });
    if (!role) {
        throw new AppError_1.AppError("Role not found", 404);
    }
    const permissions = await prisma_1.default.permission.findMany({
        where: { id: { in: permissionIds } },
        select: { id: true },
    });
    if (permissions.length !== permissionIds.length) {
        throw new AppError_1.AppError("One or more permissions do not exist", 400);
    }
    await prisma_1.default.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        if (permissionIds.length) {
            await tx.rolePermission.createMany({
                data: permissionIds.map((permissionId) => ({
                    roleId: role.id,
                    permissionId,
                })),
            });
        }
    });
    const updatedRole = await prisma_1.default.role.findUnique({
        where: { id: role.id },
        include: roleInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Role permissions updated successfully", updatedRole);
});
exports.getPermissions = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const permissions = await prisma_1.default.permission.findMany({
        include: { _count: { select: { rolePermissions: true } } },
        orderBy: [{ module: "asc" }, { action: "asc" }],
    });
    return (0, response_1.successResponse)(res, 200, "Permissions fetched successfully", permissions.map(({ _count, ...permission }) => ({
        ...permission,
        roleCount: _count.rolePermissions,
    })));
});
exports.createPermission = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const module = normalizeCode(req.body.module);
    const action = normalizeCode(req.body.action);
    const name = normalizeCode(req.body.name || `${module}_${action}`);
    const description = String(req.body.description || "").trim() || null;
    if (!module || !action || !name) {
        throw new AppError_1.AppError("Permission module and action are required", 400);
    }
    const existingPermission = await prisma_1.default.permission.findFirst({
        where: { OR: [{ name }, { module, action }] },
    });
    if (existingPermission) {
        throw new AppError_1.AppError("This permission already exists", 409);
    }
    const permission = await prisma_1.default.permission.create({
        data: { name, module, action, description },
    });
    return (0, response_1.successResponse)(res, 201, "Permission created successfully", permission);
});
exports.updatePermission = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existingPermission = await prisma_1.default.permission.findUnique({
        where: { id: req.params.id },
    });
    if (!existingPermission) {
        throw new AppError_1.AppError("Permission not found", 404);
    }
    const module = req.body.module
        ? normalizeCode(req.body.module)
        : existingPermission.module;
    const action = req.body.action
        ? normalizeCode(req.body.action)
        : existingPermission.action;
    const name = req.body.name
        ? normalizeCode(req.body.name)
        : existingPermission.name;
    if (!module || !action || !name) {
        throw new AppError_1.AppError("Permission name, module and action are required", 400);
    }
    const permission = await prisma_1.default.permission.update({
        where: { id: existingPermission.id },
        data: {
            name,
            module,
            action,
            description: req.body.description === undefined
                ? existingPermission.description
                : String(req.body.description || "").trim() || null,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Permission updated successfully", permission);
});
exports.deletePermission = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const permission = await prisma_1.default.permission.findUnique({
        where: { id: req.params.id },
    });
    if (!permission) {
        throw new AppError_1.AppError("Permission not found", 404);
    }
    await prisma_1.default.permission.delete({ where: { id: permission.id } });
    return (0, response_1.successResponse)(res, 200, "Permission deleted successfully");
});
