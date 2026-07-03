import { Router } from "express";
import { protect, allowRoles } from "../../middlewares/auth.middleware";
import {
  createAudit,
  createBacklink,
  createKeyword,
  createSeoProject,
  deleteAudit,
  deleteBacklink,
  deleteKeyword,
  deleteSeoProject,
  getProjectsWithoutSeo,
  getSeoDashboard,
  getSeoProject,
  listAudits,
  listBacklinks,
  listKeywords,
  listSeoProjects,
  suggestKeywords,
  updateBacklink,
  updateKeyword,
  updateSeoProject,
} from "./seo.controller";

const router = Router();

const seoRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "SALES_MANAGER"];

router.use(protect);
router.use(allowRoles(...seoRoles));

router.get("/dashboard", getSeoDashboard);

router.get("/projects", listSeoProjects);
router.get("/projects/without-seo", getProjectsWithoutSeo);
router.get("/projects/:id", getSeoProject);
router.post("/projects", createSeoProject);
router.put("/projects/:id", updateSeoProject);
router.delete("/projects/:id", deleteSeoProject);

router.get("/keywords", listKeywords);
router.get("/keywords/suggest", suggestKeywords);
router.post("/keywords", createKeyword);
router.put("/keywords/:id", updateKeyword);
router.delete("/keywords/:id", deleteKeyword);

router.get("/audits", listAudits);
router.post("/audits", createAudit);
router.delete("/audits/:id", deleteAudit);

router.get("/backlinks", listBacklinks);
router.post("/backlinks", createBacklink);
router.put("/backlinks/:id", updateBacklink);
router.delete("/backlinks/:id", deleteBacklink);

export default router;
