import { Response } from "express";
import prisma from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { successResponse } from "../../utils/response";

export const getTeams = asyncHandler(async (req, res: Response) => {
  const teams = await prisma.team.findMany({
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
    },
  });

  return successResponse(res, 200, "Teams fetched successfully", teams);
});

export const getTeamById = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const team = await prisma.team.findUnique({
    where: {
      id,
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

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  return successResponse(res, 200, "Team fetched successfully", team);
});

export const createTeam = asyncHandler(async (req, res: Response) => {
  const { name, description, departmentId } = req.body;

  if (!name || !name.trim()) {
    throw new AppError("Team name is required", 400);
  }

  if (!departmentId) {
    throw new AppError("Department ID is required", 400);
  }

  const department = await prisma.department.findUnique({
    where: {
      id: departmentId,
    },
  });

  if (!department) {
    throw new AppError("Department not found", 404);
  }

  const normalizedName = name.trim();

  const existingTeam = await prisma.team.findFirst({
    where: {
      name: normalizedName,
      departmentId,
    },
  });

  if (existingTeam) {
    throw new AppError("Team already exists in this department", 409);
  }

  const team = await prisma.team.create({
    data: {
      name: normalizedName,
      description: description?.trim() || null,
      departmentId,
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

  return successResponse(res, 201, "Team created successfully", team);
});

export const updateTeam = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;
  const { name, description, departmentId } = req.body;

  const team = await prisma.team.findUnique({
    where: {
      id,
    },
  });

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  if (departmentId) {
    const department = await prisma.department.findUnique({
      where: {
        id: departmentId,
      },
    });

    if (!department) {
      throw new AppError("Department not found", 404);
    }
  }

  const newName = name?.trim() || team.name;
  const newDepartmentId =
    departmentId !== undefined ? departmentId : team.departmentId;

  const existingTeam = await prisma.team.findFirst({
    where: {
      name: newName,
      departmentId: newDepartmentId,
      NOT: {
        id,
      },
    },
  });

  if (existingTeam) {
    throw new AppError(
      "Another team already exists with this name in this department",
      409
    );
  }

  const updatedTeam = await prisma.team.update({
    where: {
      id,
    },
    data: {
      name: newName,
      description:
        description !== undefined ? description?.trim() || null : team.description,
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

  return successResponse(res, 200, "Team updated successfully", updatedTeam);
});

export const deleteTeam = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const team = await prisma.team.findUnique({
    where: {
      id,
    },
  });

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  await prisma.team.delete({
    where: {
      id,
    },
  });

  return successResponse(res, 200, "Team deleted successfully");
});