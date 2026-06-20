import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  addEmployeeDocument,
  addEmployeeSalaryDetail,
  addEmployeeSkill,
  assignEmployeeManager,
  createEmployee,
  deleteEmployee,
  deleteEmployeeDocument,
  deleteEmployeeSkill,
  getEmployeeById,
  getEmployeeDocuments,
  getEmployeeProfile,
  getEmployees,
  getEmployeeSalaryDetails,
  getEmployeeSkills,
  updateEmployee,
  updateEmployeeSalaryDetail,
  updateEmployeeSkill,
  updateEmployeeStatus,
} from "./employee.controller";

const router = Router();

const employeeWriteRoles = [
  "SUPER_ADMIN",
  "DIRECTOR",
  "HR",
  "OPERATIONS_MANAGER",
];

const employeeDeleteRoles = ["SUPER_ADMIN", "DIRECTOR", "HR"];

router.get("/", protect, getEmployees);

router.get("/:id/profile", protect, getEmployeeProfile);

/* Documents */
router.get("/:id/documents", protect, getEmployeeDocuments);

router.post(
  "/:id/documents",
  protect,
  allowRoles(...employeeWriteRoles),
  addEmployeeDocument
);

router.delete(
  "/:id/documents/:documentId",
  protect,
  allowRoles(...employeeDeleteRoles),
  deleteEmployeeDocument
);

/* Skills */
router.get("/:id/skills", protect, getEmployeeSkills);

router.post(
  "/:id/skills",
  protect,
  allowRoles(...employeeWriteRoles),
  addEmployeeSkill
);

router.put(
  "/:id/skills/:skillId",
  protect,
  allowRoles(...employeeWriteRoles),
  updateEmployeeSkill
);

router.delete(
  "/:id/skills/:skillId",
  protect,
  allowRoles(...employeeDeleteRoles),
  deleteEmployeeSkill
);

/* Salary */
router.get(
  "/:id/salary",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "HR"),
  getEmployeeSalaryDetails
);

router.post(
  "/:id/salary",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "HR"),
  addEmployeeSalaryDetail
);

router.put(
  "/:id/salary/:salaryId",
  protect,
  allowRoles("SUPER_ADMIN", "DIRECTOR", "HR"),
  updateEmployeeSalaryDetail
);

/* Manager + Status */
router.put(
  "/:id/manager",
  protect,
  allowRoles(...employeeWriteRoles),
  assignEmployeeManager
);

router.put(
  "/:id/status",
  protect,
  allowRoles(...employeeWriteRoles),
  updateEmployeeStatus
);

/* Main Employee CRUD */
router.get("/:id", protect, getEmployeeById);

router.post(
  "/",
  protect,
  allowRoles(...employeeWriteRoles),
  createEmployee
);

router.put(
  "/:id",
  protect,
  allowRoles(...employeeWriteRoles),
  updateEmployee
);

router.delete(
  "/:id",
  protect,
  allowRoles(...employeeDeleteRoles),
  deleteEmployee
);

export default router;