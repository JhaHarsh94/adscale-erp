import { Response } from "express";
import prisma from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { successResponse } from "../../utils/response";

export const getDepartments = asyncHandler(async (req, res: Response) => {
  const departments = await prisma.department.findMany({
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

  return successResponse(res, 200, "Departments fetched successfully", departments);
});

export const getDepartmentById = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const department = await prisma.department.findUnique({
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
    throw new AppError("Department not found", 404);
  }

  return successResponse(res, 200, "Department fetched successfully", department);
});

export const createDepartment = asyncHandler(async (req, res: Response) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    throw new AppError("Department name is required", 400);
  }

  const normalizedName = name.trim();

  const existingDepartment = await prisma.department.findUnique({
    where: {
      name: normalizedName,
    },
  });

  if (existingDepartment) {
    throw new AppError("Department already exists", 409);
  }

  const department = await prisma.department.create({
    data: {
      name: normalizedName,
      description: description?.trim() || null,
    },
  });

  return successResponse(res, 201, "Department created successfully", department);
});

export const updateDepartment = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  const department = await prisma.department.findUnique({
    where: {
      id,
    },
  });

  if (!department) {
    throw new AppError("Department not found", 404);
  }

  if (name && name.trim() !== department.name) {
    const existingDepartment = await prisma.department.findUnique({
      where: {
        name: name.trim(),
      },
    });

    if (existingDepartment) {
      throw new AppError("Another department already exists with this name", 409);
    }
  }

  const updatedDepartment = await prisma.department.update({
    where: {
      id,
    },
    data: {
      name: name?.trim() || department.name,
      description:
        description !== undefined ? description?.trim() || null : department.description,
    },
  });

  return successResponse(
    res,
    200,
    "Department updated successfully",
    updatedDepartment
  );
});

export const deleteDepartment = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const department = await prisma.department.findUnique({
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
    throw new AppError("Department not found", 404);
  }

  if (department._count.employees > 0) {
    throw new AppError(
      "Cannot delete department because employees are assigned to it",
      400
    );
  }

  await prisma.department.delete({
    where: {
      id,
    },
  });

  return successResponse(res, 200, "Department deleted successfully");
});