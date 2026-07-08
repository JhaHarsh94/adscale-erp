import { Router } from "express";
import { protect, allowRoles } from "../../middlewares/auth.middleware";
import {
  createAccount, createCampaign, createReport, deleteAccount, deleteCampaign,
  deleteMetric, deleteReport, getAccount, getCampaign, getDashboard,
  getProjectsWithoutAds, listAccounts, listCampaigns, listMetrics, listReports,
  updateAccount, updateCampaign, upsertMetric,
} from "./googleAds.controller";

const router = Router();

const roles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "SALES_MANAGER", "TEAM_LEAD", "EMPLOYEE"];

router.use(protect);
router.use(allowRoles(...roles));

router.get("/dashboard", getDashboard);

router.get("/accounts", listAccounts);
router.get("/accounts/without-ads", getProjectsWithoutAds);
router.get("/accounts/:id", getAccount);
router.post("/accounts", createAccount);
router.put("/accounts/:id", updateAccount);
router.delete("/accounts/:id", deleteAccount);

router.get("/campaigns", listCampaigns);
router.get("/campaigns/:id", getCampaign);
router.post("/campaigns", createCampaign);
router.put("/campaigns/:id", updateCampaign);
router.delete("/campaigns/:id", deleteCampaign);

router.get("/metrics", listMetrics);
router.post("/metrics", upsertMetric);
router.delete("/metrics/:id", deleteMetric);

router.get("/reports", listReports);
router.post("/reports", createReport);
router.delete("/reports/:id", deleteReport);

export default router;
