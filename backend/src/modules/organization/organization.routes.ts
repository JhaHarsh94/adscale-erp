import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware";
import {
  getOrganizationStructure,
  getOrganizationSummary,
  getOrganizationTeams,
} from "./organization.controller";

const router = Router();

router.get("/summary", protect, getOrganizationSummary);
router.get("/structure", protect, getOrganizationStructure);
router.get("/teams", protect, getOrganizationTeams);

export default router;