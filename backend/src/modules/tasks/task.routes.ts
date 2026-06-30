import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  addDependency, changeStatus, commentsCreate, commentsList, create, dashboard, getOne, kanban, list,
  recurringCreate, recurringDelete, recurringList, remove, removeDependency, reorder, update,
} from "./task.controller";

const router = Router();

const taskReadRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const taskWriteRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "SALES_MANAGER"];
const taskAdminRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"];

router.get("/dashboard", protect, allowRoles(...taskReadRoles), dashboard);
router.get("/kanban", protect, allowRoles(...taskReadRoles), kanban);
router.get("/", protect, allowRoles(...taskReadRoles), list);
router.post("/", protect, allowRoles(...taskWriteRoles), create);
router.get("/:id", protect, allowRoles(...taskReadRoles), getOne);
router.put("/:id", protect, allowRoles(...taskWriteRoles), update);
router.delete("/:id", protect, allowRoles(...taskAdminRoles), remove);
router.post("/:id/status", protect, allowRoles(...taskWriteRoles), changeStatus);
router.post("/reorder", protect, allowRoles(...taskWriteRoles), reorder);
router.post("/:id/dependencies", protect, allowRoles(...taskWriteRoles), addDependency);
router.delete("/:id/dependencies/:depId", protect, allowRoles(...taskWriteRoles), removeDependency);
router.get("/:id/comments", protect, allowRoles(...taskReadRoles), commentsList);
router.post("/:id/comments", protect, allowRoles(...taskWriteRoles), commentsCreate);

/* Recurring */
router.get("/recurring/list", protect, allowRoles(...taskAdminRoles), recurringList);
router.post("/recurring", protect, allowRoles(...taskAdminRoles), recurringCreate);
router.delete("/recurring/:id", protect, allowRoles(...taskAdminRoles), recurringDelete);

export default router;
