import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import { convert, create, dashboard, getOne, list, pdf, publicDecision, publicPdf, publicView, remove, send, update } from "./commercial.controller";
const router = Router();
router.get("/public/:type/:token", publicView); router.get("/public/:type/:token/pdf", publicPdf); router.post("/public/:type/:token/decision", publicDecision);
const roles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "SALES_MANAGER"];
router.use(protect, allowRoles(...roles)); router.get("/dashboard", dashboard); router.get("/:type", list); router.post("/:type", create); router.get("/:type/:id", getOne); router.put("/:type/:id", update); router.delete("/:type/:id", remove); router.post("/:type/:id/send", send); router.post("/:type/:id/convert", convert); router.get("/:type/:id/pdf", pdf);
export default router;
