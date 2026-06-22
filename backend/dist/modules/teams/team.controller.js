"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeTeamMember = exports.updateTeamMemberRole = exports.addTeamMember = exports.getTeamMembers = exports.deleteTeam = exports.updateTeam = exports.createTeam = exports.getTeamById = exports.getTeams = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const asyncHandler_1 = require("../../utils/asyncHandler");
const AppError_1 = require("../../utils/AppError");
const response_1 = require("../../utils/response");
exports.getTeams = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
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
                        },
                    },
                },
            },
        },
    });
    return (0, response_1.successResponse)(res, 200, "Teams fetched successfully", teams);
});
exports.getTeamById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const team = await prisma_1.default.team.findUnique({
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
        throw new AppError_1.AppError("Team not found", 404);
    }
    return (0, response_1.successResponse)(res, 200, "Team fetched successfully", team);
});
exports.createTeam = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, description, departmentId } = req.body;
    if (!name || !name.trim()) {
        throw new AppError_1.AppError("Team name is required", 400);
    }
    if (!departmentId) {
        throw new AppError_1.AppError("Department ID is required", 400);
    }
    const department = await prisma_1.default.department.findUnique({
        where: {
            id: departmentId,
        },
    });
    if (!department) {
        throw new AppError_1.AppError("Department not found", 404);
    }
    const normalizedName = name.trim();
    const existingTeam = await prisma_1.default.team.findFirst({
        where: {
            name: normalizedName,
            departmentId,
        },
    });
    if (existingTeam) {
        throw new AppError_1.AppError("Team already exists in this department", 409);
    }
    const team = await prisma_1.default.team.create({
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
    return (0, response_1.successResponse)(res, 201, "Team created successfully", team);
});
exports.updateTeam = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { name, description, departmentId } = req.body;
    const team = await prisma_1.default.team.findUnique({
        where: {
            id,
        },
    });
    if (!team) {
        throw new AppError_1.AppError("Team not found", 404);
    }
    if (departmentId) {
        const department = await prisma_1.default.department.findUnique({
            where: {
                id: departmentId,
            },
        });
        if (!department) {
            throw new AppError_1.AppError("Department not found", 404);
        }
    }
    const newName = name?.trim() || team.name;
    const newDepartmentId = departmentId !== undefined ? departmentId : team.departmentId;
    const existingTeam = await prisma_1.default.team.findFirst({
        where: {
            name: newName,
            departmentId: newDepartmentId,
            NOT: {
                id,
            },
        },
    });
    if (existingTeam) {
        throw new AppError_1.AppError("Another team already exists with this name in this department", 409);
    }
    const updatedTeam = await prisma_1.default.team.update({
        where: {
            id,
        },
        data: {
            name: newName,
            description: description !== undefined
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
    return (0, response_1.successResponse)(res, 200, "Team updated successfully", updatedTeam);
});
exports.deleteTeam = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const team = await prisma_1.default.team.findUnique({
        where: {
            id,
        },
    });
    if (!team) {
        throw new AppError_1.AppError("Team not found", 404);
    }
    await prisma_1.default.team.delete({
        where: {
            id,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Team deleted successfully");
});
exports.getTeamMembers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const team = await prisma_1.default.team.findUnique({
        where: { id },
    });
    if (!team) {
        throw new AppError_1.AppError("Team not found", 404);
    }
    const members = await prisma_1.default.teamMember.findMany({
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
    return (0, response_1.successResponse)(res, 200, "Team members fetched successfully", members);
});
exports.addTeamMember = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { employeeId, role } = req.body;
    if (!employeeId) {
        throw new AppError_1.AppError("Employee ID is required", 400);
    }
    const team = await prisma_1.default.team.findUnique({
        where: { id },
    });
    if (!team) {
        throw new AppError_1.AppError("Team not found", 404);
    }
    const employee = await prisma_1.default.employee.findUnique({
        where: { id: employeeId },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    const existingMember = await prisma_1.default.teamMember.findUnique({
        where: {
            teamId_employeeId: {
                teamId: id,
                employeeId,
            },
        },
    });
    if (existingMember) {
        throw new AppError_1.AppError("Employee is already assigned to this team", 409);
    }
    const member = await prisma_1.default.teamMember.create({
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
    return (0, response_1.successResponse)(res, 201, "Employee added to team successfully", member);
});
exports.updateTeamMemberRole = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id, employeeId } = req.params;
    const { role } = req.body;
    if (!role) {
        throw new AppError_1.AppError("Team member role is required", 400);
    }
    const existingMember = await prisma_1.default.teamMember.findUnique({
        where: {
            teamId_employeeId: {
                teamId: id,
                employeeId,
            },
        },
    });
    if (!existingMember) {
        throw new AppError_1.AppError("Team member not found", 404);
    }
    const updatedMember = await prisma_1.default.teamMember.update({
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
    return (0, response_1.successResponse)(res, 200, "Team member role updated successfully", updatedMember);
});
exports.removeTeamMember = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id, employeeId } = req.params;
    const existingMember = await prisma_1.default.teamMember.findUnique({
        where: {
            teamId_employeeId: {
                teamId: id,
                employeeId,
            },
        },
    });
    if (!existingMember) {
        throw new AppError_1.AppError("Team member not found", 404);
    }
    await prisma_1.default.teamMember.delete({
        where: {
            teamId_employeeId: {
                teamId: id,
                employeeId,
            },
        },
    });
    return (0, response_1.successResponse)(res, 200, "Employee removed from team successfully");
});
