import { Response } from "express";
import prisma from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { successResponse } from "../../utils/response";

export const getDesignations = asyncHandler(async (req, res: Response) => {
  const designations = await prisma.designation.findMany({
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

  return successResponse(
    res,
    200,
    "Designations fetched successfully",
    designations
  );
});

export const getDesignationById = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const designation = await prisma.designation.findUnique({
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
    throw new AppError("Designation not found", 404);
  }

  return successResponse(
    res,
    200,
    "Designation fetched successfully",
    designation
  );
});

export const createDesignation = asyncHandler(async (req, res: Response) => {
  const { name, description, departmentId } = req.body;

  if (!name || !name.trim()) {
    throw new AppError("Designation name is required", 400);
  }

  const normalizedName = name.trim();

  if (departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new AppError("Department not found", 404);
    }
  }

  const existingDesignation = await prisma.designation.findFirst({
    where: {
      name: normalizedName,
      departmentId: departmentId || null,
    },
  });

  if (existingDesignation) {
    throw new AppError("Designation already exists in this department", 409);
  }

  const designation = await prisma.designation.create({
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

  return successResponse(
    res,
    201,
    "Designation created successfully",
    designation
  );
});

export const updateDesignation = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;
  const { name, description, departmentId } = req.body;

  const designation = await prisma.designation.findUnique({
    where: { id },
  });

  if (!designation) {
    throw new AppError("Designation not found", 404);
  }

  if (departmentId) {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new AppError("Department not found", 404);
    }
  }

  const newName = name?.trim() || designation.name;
  const newDepartmentId =
    departmentId !== undefined ? departmentId || null : designation.departmentId;

  const existingDesignation = await prisma.designation.findFirst({
    where: {
      name: newName,
      departmentId: newDepartmentId,
      NOT: {
        id,
      },
    },
  });

  if (existingDesignation) {
    throw new AppError(
      "Another designation already exists with this name in this department",
      409
    );
  }

  const updatedDesignation = await prisma.designation.update({
    where: { id },
    data: {
      name: newName,
      description:
        description !== undefined
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

  return successResponse(
    res,
    200,
    "Designation updated successfully",
    updatedDesignation
  );
});

export const deleteDesignation = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const designation = await prisma.designation.findUnique({
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
    throw new AppError("Designation not found", 404);
  }

  if (designation._count.employees > 0) {
    throw new AppError(
      "Cannot delete designation because employees are assigned to it",
      400
    );
  }

  await prisma.designation.delete({
    where: { id },
  });

  return successResponse(res, 200, "Designation deleted successfully");
});