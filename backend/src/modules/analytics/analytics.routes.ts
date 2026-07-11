import { Router } from "express";
import { protect, allowRoles } from "../../middlewares/auth.middleware";
import {
  createDashboard,
  createKpi,
  createWidget,
  deleteDashboard,
  deleteKpi,
  deleteKpiResult,
  deleteReport,
  deleteWidget,
  generateReport,
  getAnalyticsDashboard,
  getDashboard,
  getKpi,
  getProjectsWithoutAnalytics,
  getReport,
  listDashboards,
  listKpis,
  listKpiResults,
  listReports,
  listWidgets,
  recordKpiResult,
  updateDashboard,
  updateKpi,
  updateWidget,
} from "./analytics.controller";

const router = Router();

const analyticsRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "SALES_MANAGER", "HR"];

router.use(protect);
router.use(allowRoles(...analyticsRoles));

router.get("/dashboard", getAnalyticsDashboard);

router.get("/dashboards", listDashboards);
router.get("/dashboards/:id", getDashboard);
router.post("/dashboards", createDashboard);
router.put("/dashboards/:id", updateDashboard);
router.delete("/dashboards/:id", deleteDashboard);

router.get("/widgets", listWidgets);
router.post("/widgets", createWidget);
router.put("/widgets/:id", updateWidget);
router.delete("/widgets/:id", deleteWidget);

router.get("/reports", listReports);
router.get("/reports/:id", getReport);
router.post("/reports/generate", generateReport);
router.delete("/reports/:id", deleteReport);

router.get("/kpis", listKpis);
router.get("/kpis/:id", getKpi);
router.post("/kpis", createKpi);
router.put("/kpis/:id", updateKpi);
router.delete("/kpis/:id", deleteKpi);

router.get("/kpi-results", listKpiResults);
router.post("/kpi-results", recordKpiResult);
router.delete("/kpi-results/:id", deleteKpiResult);

router.get("/projects", getProjectsWithoutAnalytics);

export default router;
