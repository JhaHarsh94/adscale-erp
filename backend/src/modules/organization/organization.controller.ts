import { Response } from "express";
import prisma from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";

export const getOrganizationSummary = asyncHandler(async (req, res: Response) => {
  const [
    totalRoles,
    totalDepartments,
    totalDesignations,
    totalUsers,
    activeUsers,
    totalEmployees,
    totalTeams,
    totalTeamMembers,
    totalReportingRecords,
  ] = await Promise.all([
    prisma.role.count(),
    prisma.department.count(),
    prisma.designation.count(),
    prisma.user.count(),
    prisma.user.count({
      where: {
        status: "ACTIVE",
      },
    }),
    prisma.employee.count(),
    prisma.team.count(),
    prisma.teamMember.count(),
    prisma.reportingHierarchy.count(),
  ]);

  const summary = {
    roles: totalRoles,
    departments: totalDepartments,
    designations: totalDesignations,
    users: totalUsers,
    activeUsers,
    employees: totalEmployees,
    teams: totalTeams,
    teamMembers: totalTeamMembers,
    reportingHierarchyRecords: totalReportingRecords,
  };

  return successResponse(
    res,
    200,
    "Organization summary fetched successfully",
    summary
  );
});

export const getOrganizationStructure = asyncHandler(
  async (req, res: Response) => {
    const departments = await prisma.department.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        designations: {
          select: {
            id: true,
            name: true,
            description: true,
          },
          orderBy: {
            name: "asc",
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
            designation: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            employeeCode: "asc",
          },
        },
        teams: {
          include: {
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
          orderBy: {
            name: "asc",
          },
        },
      },
    });

    return successResponse(
      res,
      200,
      "Organization structure fetched successfully",
      departments
    );
  }
);

export const getOrganizationTeams = asyncHandler(async (req, res: Response) => {
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
      },
    },
  });

  return successResponse(
    res,
    200,
    "Organization teams fetched successfully",
    teams
  );
});