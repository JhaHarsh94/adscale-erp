import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  addFile, archiveArticle, createArticle, createCategory, dashboard, deleteArticle, deleteCategory, deleteFile,
  getArticle, listArticles, listCategories, publishArticle, trackView, updateArticle, updateCategory,
} from "./knowledgeBase.controller";

const router = Router();

const readRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const writeRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD"];

router.get("/dashboard", protect, allowRoles(...readRoles), dashboard);
router.get("/categories", protect, allowRoles(...readRoles), listCategories);
router.post("/categories", protect, allowRoles(...writeRoles), createCategory);
router.put("/categories/:id", protect, allowRoles(...writeRoles), updateCategory);
router.delete("/categories/:id", protect, allowRoles(...writeRoles), deleteCategory);

router.get("/articles", protect, allowRoles(...readRoles), listArticles);
router.get("/articles/:id", protect, allowRoles(...readRoles), getArticle);
router.post("/articles", protect, allowRoles(...writeRoles), createArticle);
router.put("/articles/:id", protect, allowRoles(...writeRoles), updateArticle);
router.delete("/articles/:id", protect, allowRoles(...writeRoles), deleteArticle);
router.put("/articles/:id/publish", protect, allowRoles(...writeRoles), publishArticle);
router.put("/articles/:id/archive", protect, allowRoles(...writeRoles), archiveArticle);

router.post("/articles/:id/files", protect, allowRoles(...writeRoles), addFile);
router.delete("/articles/:id/files/:fileId", protect, allowRoles(...writeRoles), deleteFile);

router.post("/articles/:id/view", protect, allowRoles(...readRoles), trackView);

export default router;
