"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const employee_controller_1 = require("./employee.controller");
const router = (0, express_1.Router)();
const employeeWriteRoles = [
    "SUPER_ADMIN",
    "DIRECTOR",
    "HR",
    "OPERATIONS_MANAGER",
];
const employeeDeleteRoles = ["SUPER_ADMIN", "DIRECTOR", "HR"];
router.get("/", auth_middleware_1.protect, employee_controller_1.getEmployees);
router.get("/:id/profile", auth_middleware_1.protect, employee_controller_1.getEmployeeProfile);
/* Documents */
router.get("/:id/documents", auth_middleware_1.protect, employee_controller_1.getEmployeeDocuments);
router.post("/:id/documents", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...employeeWriteRoles), employee_controller_1.addEmployeeDocument);
router.delete("/:id/documents/:documentId", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...employeeDeleteRoles), employee_controller_1.deleteEmployeeDocument);
/* Skills */
router.get("/:id/skills", auth_middleware_1.protect, employee_controller_1.getEmployeeSkills);
router.post("/:id/skills", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...employeeWriteRoles), employee_controller_1.addEmployeeSkill);
router.put("/:id/skills/:skillId", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...employeeWriteRoles), employee_controller_1.updateEmployeeSkill);
router.delete("/:id/skills/:skillId", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...employeeDeleteRoles), employee_controller_1.deleteEmployeeSkill);
/* Salary */
router.get("/:id/salary", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)("SUPER_ADMIN", "DIRECTOR", "HR"), employee_controller_1.getEmployeeSalaryDetails);
router.post("/:id/salary", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)("SUPER_ADMIN", "DIRECTOR", "HR"), employee_controller_1.addEmployeeSalaryDetail);
router.put("/:id/salary/:salaryId", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)("SUPER_ADMIN", "DIRECTOR", "HR"), employee_controller_1.updateEmployeeSalaryDetail);
/* Manager + Status */
router.put("/:id/manager", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...employeeWriteRoles), employee_controller_1.assignEmployeeManager);
router.put("/:id/status", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...employeeWriteRoles), employee_controller_1.updateEmployeeStatus);
/* Main Employee CRUD */
router.get("/:id", auth_middleware_1.protect, employee_controller_1.getEmployeeById);
router.post("/", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...employeeWriteRoles), employee_controller_1.createEmployee);
router.put("/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...employeeWriteRoles), employee_controller_1.updateEmployee);
router.delete("/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...employeeDeleteRoles), employee_controller_1.deleteEmployee);
exports.default = router;
