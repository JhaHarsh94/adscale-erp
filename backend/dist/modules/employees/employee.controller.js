"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmployeeStatus = exports.assignEmployeeManager = exports.updateEmployeeSalaryDetail = exports.addEmployeeSalaryDetail = exports.getEmployeeSalaryDetails = exports.deleteEmployeeSkill = exports.updateEmployeeSkill = exports.addEmployeeSkill = exports.getEmployeeSkills = exports.deleteEmployeeDocument = exports.addEmployeeDocument = exports.getEmployeeDocuments = exports.getEmployeeProfile = exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployeeById = exports.getEmployees = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../config/prisma"));
const asyncHandler_1 = require("../../utils/asyncHandler");
const AppError_1 = require("../../utils/AppError");
const response_1 = require("../../utils/response");
async function detectManagerCycle(employeeId, proposedManagerId) {
    if (employeeId === proposedManagerId)
        return true;
    let currentId = proposedManagerId;
    for (let i = 0; i < 100; i++) {
        if (!currentId)
            return false;
        const employee = await prisma_1.default.employee.findUnique({
            where: { id: currentId },
            select: { managerId: true },
        });
        if (!employee)
            return false;
        if (employee.managerId === employeeId)
            return true;
        currentId = employee.managerId;
    }
    return true;
}
const employeeInclude = {
    user: {
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            role: {
                select: {
                    id: true,
                    name: true,
                },
            },
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
    manager: {
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
    },
    teamMemberships: {
        include: {
            team: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    },
};
function validateEmploymentStatus(status) {
    if (!status)
        return;
    if (!Object.values(client_1.EmploymentStatus).includes(status)) {
        throw new AppError_1.AppError("Invalid employment status", 400);
    }
}
function validateSkillLevel(level) {
    if (!level)
        return;
    if (!Object.values(client_1.SkillLevel).includes(level)) {
        throw new AppError_1.AppError("Invalid skill level", 400);
    }
}
function validateDocumentType(type) {
    if (!type)
        return;
    if (!Object.values(client_1.EmployeeDocumentType).includes(type)) {
        throw new AppError_1.AppError("Invalid document type", 400);
    }
}
/* =========================
   Employee Directory APIs
========================= */
exports.getEmployees = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const employees = await prisma_1.default.employee.findMany({
        include: employeeInclude,
        orderBy: {
            createdAt: "desc",
        },
    });
    return (0, response_1.successResponse)(res, 200, "Employees fetched successfully", employees);
});
exports.getEmployeeById = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const employee = await prisma_1.default.employee.findUnique({
        where: { id },
        include: employeeInclude,
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    return (0, response_1.successResponse)(res, 200, "Employee fetched successfully", employee);
});
exports.createEmployee = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, email, phone, password, roleId, employeeCode, departmentId, designationId, joiningDate, salary, skills, managerId, employmentStatus, } = req.body;
    if (!name || !email || !password || !roleId || !employeeCode) {
        throw new AppError_1.AppError("Name, email, password, role ID and employee code are required", 400);
    }
    validateEmploymentStatus(employmentStatus);
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma_1.default.user.findUnique({
        where: { email: normalizedEmail },
    });
    if (existingUser) {
        throw new AppError_1.AppError("User with this email already exists", 409);
    }
    const existingEmployee = await prisma_1.default.employee.findUnique({
        where: { employeeCode: employeeCode.trim() },
    });
    if (existingEmployee) {
        throw new AppError_1.AppError("Employee code already exists", 409);
    }
    const role = await prisma_1.default.role.findUnique({
        where: { id: roleId },
    });
    if (!role) {
        throw new AppError_1.AppError("Role not found", 404);
    }
    if (departmentId) {
        const department = await prisma_1.default.department.findUnique({
            where: { id: departmentId },
        });
        if (!department) {
            throw new AppError_1.AppError("Department not found", 404);
        }
    }
    if (designationId) {
        const designation = await prisma_1.default.designation.findUnique({
            where: { id: designationId },
        });
        if (!designation) {
            throw new AppError_1.AppError("Designation not found", 404);
        }
    }
    if (managerId) {
        const manager = await prisma_1.default.employee.findUnique({
            where: { id: managerId },
        });
        if (!manager) {
            throw new AppError_1.AppError("Manager not found", 404);
        }
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    const employee = await prisma_1.default.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                phone: phone?.trim() || null,
                password: hashedPassword,
                roleId,
            },
        });
        const createdEmployee = await tx.employee.create({
            data: {
                userId: user.id,
                employeeCode: employeeCode.trim(),
                departmentId: departmentId || null,
                designationId: designationId || null,
                joiningDate: joiningDate ? new Date(joiningDate) : null,
                salary: salary !== undefined && salary !== null && salary !== ""
                    ? Number(salary)
                    : null,
                skills: skills?.trim() || null,
                managerId: managerId || null,
                employmentStatus: employmentStatus || client_1.EmploymentStatus.ACTIVE,
            },
            include: employeeInclude,
        });
        await tx.reportingHierarchy.create({
            data: {
                employeeId: createdEmployee.id,
                reportsToId: managerId || null,
            },
        });
        return createdEmployee;
    });
    return (0, response_1.successResponse)(res, 201, "Employee created successfully", employee);
});
exports.updateEmployee = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { name, phone, departmentId, designationId, joiningDate, salary, skills, managerId, employmentStatus, } = req.body;
    validateEmploymentStatus(employmentStatus);
    const employee = await prisma_1.default.employee.findUnique({
        where: { id },
        include: {
            user: true,
        },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    if (managerId && managerId === id) {
        throw new AppError_1.AppError("Employee cannot be their own manager", 400);
    }
    if (managerId && await detectManagerCycle(id, managerId)) {
        throw new AppError_1.AppError("Circular manager reference detected", 400);
    }
    if (departmentId) {
        const department = await prisma_1.default.department.findUnique({
            where: { id: departmentId },
        });
        if (!department) {
            throw new AppError_1.AppError("Department not found", 404);
        }
    }
    if (designationId) {
        const designation = await prisma_1.default.designation.findUnique({
            where: { id: designationId },
        });
        if (!designation) {
            throw new AppError_1.AppError("Designation not found", 404);
        }
    }
    if (managerId) {
        const manager = await prisma_1.default.employee.findUnique({
            where: { id: managerId },
        });
        if (!manager) {
            throw new AppError_1.AppError("Manager not found", 404);
        }
    }
    const updatedEmployee = await prisma_1.default.$transaction(async (tx) => {
        if (name || phone !== undefined) {
            await tx.user.update({
                where: { id: employee.userId },
                data: {
                    name: name?.trim() || employee.user.name,
                    phone: phone !== undefined ? phone?.trim() || null : employee.user.phone,
                },
            });
        }
        const updated = await tx.employee.update({
            where: { id },
            data: {
                departmentId: departmentId !== undefined ? departmentId || null : undefined,
                designationId: designationId !== undefined ? designationId || null : undefined,
                joiningDate: joiningDate !== undefined
                    ? joiningDate
                        ? new Date(joiningDate)
                        : null
                    : undefined,
                salary: salary !== undefined
                    ? salary !== null && salary !== ""
                        ? Number(salary)
                        : null
                    : undefined,
                skills: skills !== undefined ? skills?.trim() || null : undefined,
                managerId: managerId !== undefined ? managerId || null : undefined,
                employmentStatus: employmentStatus
                    ? employmentStatus
                    : undefined,
            },
            include: employeeInclude,
        });
        if (managerId !== undefined) {
            await tx.reportingHierarchy.upsert({
                where: { employeeId: id },
                update: {
                    reportsToId: managerId || null,
                },
                create: {
                    employeeId: id,
                    reportsToId: managerId || null,
                },
            });
        }
        return updated;
    });
    return (0, response_1.successResponse)(res, 200, "Employee updated successfully", updatedEmployee);
});
exports.deleteEmployee = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const employee = await prisma_1.default.employee.findUnique({
        where: { id },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    await prisma_1.default.$transaction(async (tx) => {
        await tx.teamMember.deleteMany({
            where: { employeeId: id },
        });
        await tx.reportingHierarchy.deleteMany({
            where: {
                OR: [{ employeeId: id }, { reportsToId: id }],
            },
        });
        await tx.employeeDocument.deleteMany({
            where: { employeeId: id },
        });
        await tx.employeeSkill.deleteMany({
            where: { employeeId: id },
        });
        await tx.employeeSalaryDetail.deleteMany({
            where: { employeeId: id },
        });
        await tx.employee.updateMany({
            where: { managerId: id },
            data: { managerId: null },
        });
        await tx.employee.delete({
            where: { id },
        });
        await tx.user.delete({
            where: { id: employee.userId },
        });
    });
    return (0, response_1.successResponse)(res, 200, "Employee deleted successfully");
});
/* =========================
   Employee Profile API
========================= */
exports.getEmployeeProfile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const employee = await prisma_1.default.employee.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    status: true,
                    role: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                        },
                    },
                },
            },
            department: true,
            designation: true,
            manager: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                        },
                    },
                    department: true,
                    designation: true,
                },
            },
            subordinates: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            },
            teamMemberships: {
                include: {
                    team: {
                        include: {
                            department: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            },
            reportingAsEmployee: {
                include: {
                    reportsTo: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            },
            reportingAsManager: {
                include: {
                    employee: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            },
            documents: {
                orderBy: {
                    createdAt: "desc",
                },
            },
            employeeSkills: {
                orderBy: {
                    skillName: "asc",
                },
            },
            salaryDetails: {
                orderBy: {
                    effectiveFrom: "desc",
                },
            },
        },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee profile not found", 404);
    }
    return (0, response_1.successResponse)(res, 200, "Employee profile fetched successfully", employee);
});
/* =========================
   Employee Documents APIs
========================= */
exports.getEmployeeDocuments = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const employee = await prisma_1.default.employee.findUnique({
        where: { id },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    const documents = await prisma_1.default.employeeDocument.findMany({
        where: { employeeId: id },
        orderBy: {
            createdAt: "desc",
        },
    });
    return (0, response_1.successResponse)(res, 200, "Employee documents fetched successfully", documents);
});
exports.addEmployeeDocument = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { type, name, fileUrl, fileKey, notes } = req.body;
    if (!name || !name.trim()) {
        throw new AppError_1.AppError("Document name is required", 400);
    }
    validateDocumentType(type);
    const employee = await prisma_1.default.employee.findUnique({
        where: { id },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    const document = await prisma_1.default.employeeDocument.create({
        data: {
            employeeId: id,
            type: type || client_1.EmployeeDocumentType.OTHER,
            name: name.trim(),
            fileUrl: fileUrl?.trim() || null,
            fileKey: fileKey?.trim() || null,
            notes: notes?.trim() || null,
        },
    });
    return (0, response_1.successResponse)(res, 201, "Employee document added successfully", document);
});
exports.deleteEmployeeDocument = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id, documentId } = req.params;
    const document = await prisma_1.default.employeeDocument.findFirst({
        where: {
            id: documentId,
            employeeId: id,
        },
    });
    if (!document) {
        throw new AppError_1.AppError("Employee document not found", 404);
    }
    await prisma_1.default.employeeDocument.delete({
        where: { id: documentId },
    });
    return (0, response_1.successResponse)(res, 200, "Employee document deleted successfully");
});
/* =========================
   Employee Skills APIs
========================= */
exports.getEmployeeSkills = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const employee = await prisma_1.default.employee.findUnique({
        where: { id },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    const skills = await prisma_1.default.employeeSkill.findMany({
        where: { employeeId: id },
        orderBy: {
            skillName: "asc",
        },
    });
    return (0, response_1.successResponse)(res, 200, "Employee skills fetched successfully", skills);
});
exports.addEmployeeSkill = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { skillName, level, yearsOfExperience, notes } = req.body;
    if (!skillName || !skillName.trim()) {
        throw new AppError_1.AppError("Skill name is required", 400);
    }
    validateSkillLevel(level);
    const employee = await prisma_1.default.employee.findUnique({
        where: { id },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    const existingSkill = await prisma_1.default.employeeSkill.findUnique({
        where: {
            employeeId_skillName: {
                employeeId: id,
                skillName: skillName.trim(),
            },
        },
    });
    if (existingSkill) {
        throw new AppError_1.AppError("Skill already exists for this employee", 409);
    }
    const skill = await prisma_1.default.employeeSkill.create({
        data: {
            employeeId: id,
            skillName: skillName.trim(),
            level: level || client_1.SkillLevel.BEGINNER,
            yearsOfExperience: yearsOfExperience !== undefined && yearsOfExperience !== null
                ? Number(yearsOfExperience)
                : null,
            notes: notes?.trim() || null,
        },
    });
    return (0, response_1.successResponse)(res, 201, "Employee skill added successfully", skill);
});
exports.updateEmployeeSkill = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id, skillId } = req.params;
    const { skillName, level, yearsOfExperience, notes } = req.body;
    validateSkillLevel(level);
    const skill = await prisma_1.default.employeeSkill.findFirst({
        where: {
            id: skillId,
            employeeId: id,
        },
    });
    if (!skill) {
        throw new AppError_1.AppError("Employee skill not found", 404);
    }
    const updatedSkill = await prisma_1.default.employeeSkill.update({
        where: { id: skillId },
        data: {
            skillName: skillName !== undefined ? skillName.trim() : undefined,
            level: level ? level : undefined,
            yearsOfExperience: yearsOfExperience !== undefined
                ? yearsOfExperience !== null && yearsOfExperience !== ""
                    ? Number(yearsOfExperience)
                    : null
                : undefined,
            notes: notes !== undefined ? notes?.trim() || null : undefined,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Employee skill updated successfully", updatedSkill);
});
exports.deleteEmployeeSkill = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id, skillId } = req.params;
    const skill = await prisma_1.default.employeeSkill.findFirst({
        where: {
            id: skillId,
            employeeId: id,
        },
    });
    if (!skill) {
        throw new AppError_1.AppError("Employee skill not found", 404);
    }
    await prisma_1.default.employeeSkill.delete({
        where: { id: skillId },
    });
    return (0, response_1.successResponse)(res, 200, "Employee skill deleted successfully");
});
/* =========================
   Employee Salary APIs
========================= */
exports.getEmployeeSalaryDetails = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const employee = await prisma_1.default.employee.findUnique({
        where: { id },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    const salaryDetails = await prisma_1.default.employeeSalaryDetail.findMany({
        where: { employeeId: id },
        orderBy: {
            effectiveFrom: "desc",
        },
    });
    return (0, response_1.successResponse)(res, 200, "Employee salary details fetched successfully", salaryDetails);
});
exports.addEmployeeSalaryDetail = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { basicSalary, hra, allowances, deductions, netSalary, effectiveFrom, effectiveTo, isCurrent, } = req.body;
    if (basicSalary === undefined || basicSalary === null || basicSalary === "") {
        throw new AppError_1.AppError("Basic salary is required", 400);
    }
    if (!effectiveFrom) {
        throw new AppError_1.AppError("Effective from date is required", 400);
    }
    const employee = await prisma_1.default.employee.findUnique({
        where: { id },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    const basic = Number(basicSalary);
    const hraAmount = hra ? Number(hra) : 0;
    const allowanceAmount = allowances ? Number(allowances) : 0;
    const deductionAmount = deductions ? Number(deductions) : 0;
    const calculatedNetSalary = netSalary !== undefined && netSalary !== null && netSalary !== ""
        ? Number(netSalary)
        : basic + hraAmount + allowanceAmount - deductionAmount;
    const salaryDetail = await prisma_1.default.$transaction(async (tx) => {
        if (isCurrent !== false) {
            await tx.employeeSalaryDetail.updateMany({
                where: {
                    employeeId: id,
                    isCurrent: true,
                },
                data: {
                    isCurrent: false,
                },
            });
        }
        const createdSalary = await tx.employeeSalaryDetail.create({
            data: {
                employeeId: id,
                basicSalary: basic,
                hra: hraAmount,
                allowances: allowanceAmount,
                deductions: deductionAmount,
                netSalary: calculatedNetSalary,
                effectiveFrom: new Date(effectiveFrom),
                effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
                isCurrent: isCurrent !== false,
            },
        });
        if (isCurrent !== false) {
            await tx.employee.update({
                where: { id },
                data: {
                    salary: calculatedNetSalary,
                },
            });
        }
        return createdSalary;
    });
    return (0, response_1.successResponse)(res, 201, "Employee salary detail added successfully", salaryDetail);
});
exports.updateEmployeeSalaryDetail = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id, salaryId } = req.params;
    const { basicSalary, hra, allowances, deductions, netSalary, effectiveFrom, effectiveTo, isCurrent, } = req.body;
    const salaryDetail = await prisma_1.default.employeeSalaryDetail.findFirst({
        where: {
            id: salaryId,
            employeeId: id,
        },
    });
    if (!salaryDetail) {
        throw new AppError_1.AppError("Employee salary detail not found", 404);
    }
    const basic = basicSalary !== undefined ? Number(basicSalary) : salaryDetail.basicSalary;
    const hraAmount = hra !== undefined ? Number(hra) : salaryDetail.hra;
    const allowanceAmount = allowances !== undefined ? Number(allowances) : salaryDetail.allowances;
    const deductionAmount = deductions !== undefined ? Number(deductions) : salaryDetail.deductions;
    const calculatedNetSalary = netSalary !== undefined && netSalary !== null && netSalary !== ""
        ? Number(netSalary)
        : basic + hraAmount + allowanceAmount - deductionAmount;
    const updatedSalary = await prisma_1.default.$transaction(async (tx) => {
        if (isCurrent === true) {
            await tx.employeeSalaryDetail.updateMany({
                where: {
                    employeeId: id,
                    isCurrent: true,
                    NOT: {
                        id: salaryId,
                    },
                },
                data: {
                    isCurrent: false,
                },
            });
        }
        const updated = await tx.employeeSalaryDetail.update({
            where: { id: salaryId },
            data: {
                basicSalary: basic,
                hra: hraAmount,
                allowances: allowanceAmount,
                deductions: deductionAmount,
                netSalary: calculatedNetSalary,
                effectiveFrom: effectiveFrom
                    ? new Date(effectiveFrom)
                    : salaryDetail.effectiveFrom,
                effectiveTo: effectiveTo !== undefined
                    ? effectiveTo
                        ? new Date(effectiveTo)
                        : null
                    : salaryDetail.effectiveTo,
                isCurrent: isCurrent !== undefined ? Boolean(isCurrent) : salaryDetail.isCurrent,
            },
        });
        if (updated.isCurrent) {
            await tx.employee.update({
                where: { id },
                data: {
                    salary: updated.netSalary,
                },
            });
        }
        return updated;
    });
    return (0, response_1.successResponse)(res, 200, "Employee salary detail updated successfully", updatedSalary);
});
/* =========================
   Manager + Status APIs
========================= */
exports.assignEmployeeManager = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { managerId } = req.body;
    const employee = await prisma_1.default.employee.findUnique({
        where: { id },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    if (managerId && managerId === id) {
        throw new AppError_1.AppError("Employee cannot report to themselves", 400);
    }
    if (managerId && await detectManagerCycle(id, managerId)) {
        throw new AppError_1.AppError("Circular manager reference detected", 400);
    }
    if (managerId) {
        const manager = await prisma_1.default.employee.findUnique({
            where: { id: managerId },
        });
        if (!manager) {
            throw new AppError_1.AppError("Manager not found", 404);
        }
    }
    const updatedEmployee = await prisma_1.default.$transaction(async (tx) => {
        const updated = await tx.employee.update({
            where: { id },
            data: {
                managerId: managerId || null,
            },
            include: employeeInclude,
        });
        await tx.reportingHierarchy.upsert({
            where: { employeeId: id },
            update: {
                reportsToId: managerId || null,
            },
            create: {
                employeeId: id,
                reportsToId: managerId || null,
            },
        });
        return updated;
    });
    return (0, response_1.successResponse)(res, 200, "Employee manager assigned successfully", updatedEmployee);
});
exports.updateEmployeeStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { employmentStatus } = req.body;
    if (!employmentStatus) {
        throw new AppError_1.AppError("Employment status is required", 400);
    }
    validateEmploymentStatus(employmentStatus);
    const employee = await prisma_1.default.employee.findUnique({
        where: { id },
    });
    if (!employee) {
        throw new AppError_1.AppError("Employee not found", 404);
    }
    const updatedEmployee = await prisma_1.default.employee.update({
        where: { id },
        data: {
            employmentStatus: employmentStatus,
        },
        include: employeeInclude,
    });
    return (0, response_1.successResponse)(res, 200, "Employee status updated successfully", updatedEmployee);
});
