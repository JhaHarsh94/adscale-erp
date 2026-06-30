import { Response } from "express";
import prisma from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { successResponse } from "../../utils/response";

const normalizeCode = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const roleInclude = {
  rolePermissions: {
    include: { permission: true },
    orderBy: { permission: { name: "asc" as const } },
  },
  _count: { select: { users: true } },
};

export const getRoles = asyncHandler(async (_req, res: Response) => {
  const roles = await prisma.role.findMany({
    include: roleInclude,
    orderBy: { name: "asc" },
  });

  return successResponse(
    res,
    200,
    "Roles fetched successfully",
    roles.map(({ rolePermissions, _count, ...role }) => ({
      ...role,
      permissions: rolePermissions.map((item) => item.permission),
      userCount: _count.users,
    }))
  );
});

export const createRole = asyncHandler(async (req, res: Response) => {
  const name = normalizeCode(req.body.name);
  const description = String(req.body.description || "").trim() || null;

  if (!name) {
    throw new AppError("Role name is required", 400);
  }

  const existingRole = await prisma.role.findUnique({ where: { name } });
  if (existingRole) {
    throw new AppError("A role with this name already exists", 409);
  }

  const role = await prisma.role.create({
    data: { name, description },
  });

  return successResponse(res, 201, "Role created successfully", role);
});

export const updateRole = asyncHandler(async (req, res: Response) => {
  const existingRole = await prisma.role.findUnique({
    where: { id: req.params.id },
  });

  if (!existingRole) {
    throw new AppError("Role not found", 404);
  }

  const name = req.body.name ? normalizeCode(req.body.name) : existingRole.name;
  if (!name) {
    throw new AppError("Role name is required", 400);
  }

  const role = await prisma.role.update({
    where: { id: existingRole.id },
    data: {
      name,
      description:
        req.body.description === undefined
          ? existingRole.description
          : String(req.body.description || "").trim() || null,
    },
  });

  return successResponse(res, 200, "Role updated successfully", role);
});

export const deleteRole = asyncHandler(async (req, res: Response) => {
  const role = await prisma.role.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { users: true } } },
  });

  if (!role) {
    throw new AppError("Role not found", 404);
  }

  if (role.name === "SUPER_ADMIN") {
    throw new AppError("The SUPER_ADMIN role cannot be deleted", 400);
  }

  if (role._count.users > 0) {
    throw new AppError("Reassign users before deleting this role", 409);
  }

  await prisma.role.delete({ where: { id: role.id } });
  return successResponse(res, 200, "Role deleted successfully");
});

export const setRolePermissions = asyncHandler(async (req, res: Response) => {
  const permissionIds: string[] | null = Array.isArray(req.body.permissionIds)
    ? [
        ...new Set<string>(
          req.body.permissionIds.map((value: unknown) => String(value))
        ),
      ]
    : null;

  if (!permissionIds) {
    throw new AppError("permissionIds must be an array", 400);
  }

  const role = await prisma.role.findUnique({ where: { id: req.params.id } });
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  const permissions = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
    select: { id: true },
  });

  if (permissions.length !== permissionIds.length) {
    throw new AppError("One or more permissions do not exist", 400);
  }

  await prisma.$transaction(async (tx) => {
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

  const updatedRole = await prisma.role.findUnique({
    where: { id: role.id },
    include: roleInclude,
  });

  return successResponse(
    res,
    200,
    "Role permissions updated successfully",
    updatedRole
  );
});

export const getPermissions = asyncHandler(async (_req, res: Response) => {
  const permissions = await prisma.permission.findMany({
    include: { _count: { select: { rolePermissions: true } } },
    orderBy: [{ module: "asc" }, { action: "asc" }],
  });

  return successResponse(
    res,
    200,
    "Permissions fetched successfully",
    permissions.map(({ _count, ...permission }) => ({
      ...permission,
      roleCount: _count.rolePermissions,
    }))
  );
});

export const createPermission = asyncHandler(async (req, res: Response) => {
  const module = normalizeCode(req.body.module);
  const action = normalizeCode(req.body.action);
  const name = normalizeCode(req.body.name || `${module}_${action}`);
  const description = String(req.body.description || "").trim() || null;

  if (!module || !action || !name) {
    throw new AppError("Permission module and action are required", 400);
  }

  const existingPermission = await prisma.permission.findFirst({
    where: { OR: [{ name }, { module, action }] },
  });
  if (existingPermission) {
    throw new AppError("This permission already exists", 409);
  }

  const permission = await prisma.permission.create({
    data: { name, module, action, description },
  });

  return successResponse(
    res,
    201,
    "Permission created successfully",
    permission
  );
});

export const updatePermission = asyncHandler(async (req, res: Response) => {
  const existingPermission = await prisma.permission.findUnique({
    where: { id: req.params.id },
  });
  if (!existingPermission) {
    throw new AppError("Permission not found", 404);
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
    throw new AppError("Permission name, module and action are required", 400);
  }

  const permission = await prisma.permission.update({
    where: { id: existingPermission.id },
    data: {
      name,
      module,
      action,
      description:
        req.body.description === undefined
          ? existingPermission.description
          : String(req.body.description || "").trim() || null,
    },
  });

  return successResponse(
    res,
    200,
    "Permission updated successfully",
    permission
  );
});

export const deletePermission = asyncHandler(async (req, res: Response) => {
  const permission = await prisma.permission.findUnique({
    where: { id: req.params.id },
  });
  if (!permission) {
    throw new AppError("Permission not found", 404);
  }

  await prisma.permission.delete({ where: { id: permission.id } });
  return successResponse(res, 200, "Permission deleted successfully");
});
