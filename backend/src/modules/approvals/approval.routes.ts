import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  actOnStep, addStep, cancel, commentsCreate, create, dashboard, getOne, list, pendingReview, remove, requestRevisions, resubmit, update,
} from "./approval.controller";

const router = Router();

const readRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const writeRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const adminRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"];

router.get("/dashboard", protect, allowRoles(...readRoles), dashboard);
router.get("/", protect, allowRoles(...readRoles), list);
router.get("/pending-review", protect, allowRoles(...readRoles), pendingReview);
router.post("/", protect, allowRoles(...writeRoles), create);
router.get("/:id", protect, allowRoles(...readRoles), getOne);
router.put("/:id", protect, allowRoles(...writeRoles), update);
router.delete("/:id", protect, allowRoles(...adminRoles), remove);
router.post("/:id/cancel", protect, allowRoles(...writeRoles), cancel);
router.post("/:id/revisions", protect, allowRoles(...adminRoles), requestRevisions);
router.post("/:id/resubmit", protect, allowRoles(...writeRoles), resubmit);
router.post("/:id/comments", protect, allowRoles(...writeRoles), commentsCreate);
router.post("/:id/steps", protect, allowRoles(...adminRoles), addStep);
router.post("/:id/steps/:stepId/act", protect, allowRoles(...adminRoles, "TEAM_LEAD"), actOnStep);

export default router;
