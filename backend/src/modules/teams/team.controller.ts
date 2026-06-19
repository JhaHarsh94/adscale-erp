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
      members: {
        include: {
          employee: {
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
      members: {
        include: {
          employee: {
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
        description !== undefined
          ? description?.trim() || null
          : team.description,
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

export const getTeamMembers = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;

  const team = await prisma.team.findUnique({
    where: { id },
  });

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const members = await prisma.teamMember.findMany({
    where: {
      teamId: id,
    },
    include: {
      employee: {
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
    },
    orderBy: {
      joinedAt: "desc",
    },
  });

  return successResponse(res, 200, "Team members fetched successfully", members);
});

export const addTeamMember = asyncHandler(async (req, res: Response) => {
  const { id } = req.params;
  const { employeeId, role } = req.body;

  if (!employeeId) {
    throw new AppError("Employee ID is required", 400);
  }

  const team = await prisma.team.findUnique({
    where: { id },
  });

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  const existingMember = await prisma.teamMember.findUnique({
    where: {
      teamId_employeeId: {
        teamId: id,
        employeeId,
      },
    },
  });

  if (existingMember) {
    throw new AppError("Employee is already assigned to this team", 409);
  }

  const member = await prisma.teamMember.create({
    data: {
      teamId: id,
      employeeId,
      role: role || "MEMBER",
    },
    include: {
      employee: {
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
    },
  });

  return successResponse(res, 201, "Employee added to team successfully", member);
});

export const updateTeamMemberRole = asyncHandler(
  async (req, res: Response) => {
    const { id, employeeId } = req.params;
    const { role } = req.body;

    if (!role) {
      throw new AppError("Team member role is required", 400);
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_employeeId: {
          teamId: id,
          employeeId,
        },
      },
    });

    if (!existingMember) {
      throw new AppError("Team member not found", 404);
    }

    const updatedMember = await prisma.teamMember.update({
      where: {
        teamId_employeeId: {
          teamId: id,
          employeeId,
        },
      },
      data: {
        role,
      },
      include: {
        employee: {
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
      },
    });

    return successResponse(
      res,
      200,
      "Team member role updated successfully",
      updatedMember
    );
  }
);

export const removeTeamMember = asyncHandler(async (req, res: Response) => {
  const { id, employeeId } = req.params;

  const existingMember = await prisma.teamMember.findUnique({
    where: {
      teamId_employeeId: {
        teamId: id,
        employeeId,
      },
    },
  });

  if (!existingMember) {
    throw new AppError("Team member not found", 404);
  }

  await prisma.teamMember.delete({
    where: {
      teamId_employeeId: {
        teamId: id,
        employeeId,
      },
    },
  });

  return successResponse(res, 200, "Employee removed from team successfully");
});