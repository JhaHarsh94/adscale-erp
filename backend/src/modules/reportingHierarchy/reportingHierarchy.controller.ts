import { Response } from "express";
import prisma from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { successResponse } from "../../utils/response";

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

export const getReportingHierarchy = asyncHandler(async (req, res: Response) => {
  const hierarchy = await prisma.reportingHierarchy.findMany({
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

  return successResponse(
    res,
    200,
    "Reporting hierarchy fetched successfully",
    hierarchy
  );
});

export const getReportingHierarchyById = asyncHandler(
  async (req, res: Response) => {
    const { id } = req.params;

    const hierarchy = await prisma.reportingHierarchy.findUnique({
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
      throw new AppError("Reporting hierarchy record not found", 404);
    }

    return successResponse(
      res,
      200,
      "Reporting hierarchy record fetched successfully",
      hierarchy
    );
  }
);

export const createReportingHierarchy = asyncHandler(
  async (req, res: Response) => {
    const { employeeId, reportsToId } = req.body;

    if (!employeeId) {
      throw new AppError("Employee ID is required", 400);
    }

    if (reportsToId && employeeId === reportsToId) {
      throw new AppError("Employee cannot report to themselves", 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new AppError("Employee not found", 404);
    }

    if (reportsToId) {
      const manager = await prisma.employee.findUnique({
        where: { id: reportsToId },
      });

      if (!manager) {
        throw new AppError("Reporting manager not found", 404);
      }
    }

    const existingHierarchy = await prisma.reportingHierarchy.findUnique({
      where: { employeeId },
    });

    if (existingHierarchy) {
      throw new AppError(
        "Reporting hierarchy already exists for this employee",
        409
      );
    }

    const hierarchy = await prisma.reportingHierarchy.create({
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

    return successResponse(
      res,
      201,
      "Reporting hierarchy created successfully",
      hierarchy
    );
  }
);

export const updateReportingHierarchy = asyncHandler(
  async (req, res: Response) => {
    const { id } = req.params;
    const { reportsToId } = req.body;

    const hierarchy = await prisma.reportingHierarchy.findUnique({
      where: { id },
    });

    if (!hierarchy) {
      throw new AppError("Reporting hierarchy record not found", 404);
    }

    if (reportsToId && hierarchy.employeeId === reportsToId) {
      throw new AppError("Employee cannot report to themselves", 400);
    }

    if (reportsToId) {
      const manager = await prisma.employee.findUnique({
        where: { id: reportsToId },
      });

      if (!manager) {
        throw new AppError("Reporting manager not found", 404);
      }
    }

    const updatedHierarchy = await prisma.reportingHierarchy.update({
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

    return successResponse(
      res,
      200,
      "Reporting hierarchy updated successfully",
      updatedHierarchy
    );
  }
);

export const deleteReportingHierarchy = asyncHandler(
  async (req, res: Response) => {
    const { id } = req.params;

    const hierarchy = await prisma.reportingHierarchy.findUnique({
      where: { id },
    });

    if (!hierarchy) {
      throw new AppError("Reporting hierarchy record not found", 404);
    }

    await prisma.reportingHierarchy.delete({
      where: { id },
    });

    return successResponse(
      res,
      200,
      "Reporting hierarchy deleted successfully"
    );
  }
);