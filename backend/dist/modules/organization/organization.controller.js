"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrganizationTeams = exports.getOrganizationStructure = exports.getOrganizationSummary = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
exports.getOrganizationSummary = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const [totalRoles, totalDepartments, totalDesignations, totalUsers, activeUsers, totalEmployees, totalTeams, totalTeamMembers, totalReportingRecords,] = await Promise.all([
        prisma_1.default.role.count(),
        prisma_1.default.department.count(),
        prisma_1.default.designation.count(),
        prisma_1.default.user.count(),
        prisma_1.default.user.count({
            where: {
                status: "ACTIVE",
            },
        }),
        prisma_1.default.employee.count(),
        prisma_1.default.team.count(),
        prisma_1.default.teamMember.count(),
        prisma_1.default.reportingHierarchy.count(),
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
    return (0, response_1.successResponse)(res, 200, "Organization summary fetched successfully", summary);
});
exports.getOrganizationStructure = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const departments = await prisma_1.default.department.findMany({
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
    return (0, response_1.successResponse)(res, 200, "Organization structure fetched successfully", departments);
});
exports.getOrganizationTeams = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const teams = await prisma_1.default.team.findMany({
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
    return (0, response_1.successResponse)(res, 200, "Organization teams fetched successfully", teams);
});
