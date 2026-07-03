import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  completeFollowUp,
  convertLeadToClient,
  createClient,
  createClientContact,
  createFollowUp,
  createLead,
  createPipelineItem,
  deleteClient,
  deleteClientContact,
  deleteFollowUp,
  deleteLead,
  deletePipelineItem,
  getClientById,
  getClients,
  getCrmDashboard,
  getFollowUps,
  getLeadById,
  getLeads,
  getSalesPipeline,
  importSheetLeads,
  getSheetConnectionStatus,
  updateClient,
  updateClientContact,
  updateFollowUp,
  updateLead,
  updatePipelineItem,
  updatePipelineStage,
} from "./crm.controller";

const router = Router();

const crmReadRoles = [
  "SUPER_ADMIN",
  "DIRECTOR",
  "OPERATIONS_MANAGER",
  "SALES_MANAGER",
  "HR",
];

const crmWriteRoles = [
  "SUPER_ADMIN",
  "DIRECTOR",
  "OPERATIONS_MANAGER",
  "SALES_MANAGER",
];

const crmDeleteRoles = ["SUPER_ADMIN", "DIRECTOR", "SALES_MANAGER"];

router.get("/dashboard", protect, allowRoles(...crmReadRoles), getCrmDashboard);

/* Leads */
router.get("/leads", protect, allowRoles(...crmReadRoles), getLeads);
router.post("/leads", protect, allowRoles(...crmWriteRoles), createLead);
router.get("/leads/:id", protect, allowRoles(...crmReadRoles), getLeadById);
router.put("/leads/:id", protect, allowRoles(...crmWriteRoles), updateLead);
router.delete("/leads/:id", protect, allowRoles(...crmDeleteRoles), deleteLead);
router.post(
  "/leads/:id/convert",
  protect,
  allowRoles(...crmWriteRoles),
  convertLeadToClient
);

/* Clients */
router.get("/clients", protect, allowRoles(...crmReadRoles), getClients);
router.post("/clients", protect, allowRoles(...crmWriteRoles), createClient);
router.get("/clients/:id", protect, allowRoles(...crmReadRoles), getClientById);
router.put("/clients/:id", protect, allowRoles(...crmWriteRoles), updateClient);
router.delete(
  "/clients/:id",
  protect,
  allowRoles(...crmDeleteRoles),
  deleteClient
);

/* Client Contacts */
router.post(
  "/clients/:clientId/contacts",
  protect,
  allowRoles(...crmWriteRoles),
  createClientContact
);
router.put(
  "/contacts/:contactId",
  protect,
  allowRoles(...crmWriteRoles),
  updateClientContact
);
router.delete(
  "/contacts/:contactId",
  protect,
  allowRoles(...crmDeleteRoles),
  deleteClientContact
);

/* Follow Ups */
router.get("/follow-ups", protect, allowRoles(...crmReadRoles), getFollowUps);
router.post(
  "/follow-ups",
  protect,
  allowRoles(...crmWriteRoles),
  createFollowUp
);
router.put(
  "/follow-ups/:id",
  protect,
  allowRoles(...crmWriteRoles),
  updateFollowUp
);
router.put(
  "/follow-ups/:id/complete",
  protect,
  allowRoles(...crmWriteRoles),
  completeFollowUp
);
router.delete(
  "/follow-ups/:id",
  protect,
  allowRoles(...crmDeleteRoles),
  deleteFollowUp
);

/* Sales Pipeline */
router.get(
  "/sales-pipeline",
  protect,
  allowRoles(...crmReadRoles),
  getSalesPipeline
);
router.post(
  "/sales-pipeline",
  protect,
  allowRoles(...crmWriteRoles),
  createPipelineItem
);
router.put(
  "/sales-pipeline/:id",
  protect,
  allowRoles(...crmWriteRoles),
  updatePipelineItem
);
router.put(
  "/sales-pipeline/:id/stage",
  protect,
  allowRoles(...crmWriteRoles),
  updatePipelineStage
);
router.delete(
  "/sales-pipeline/:id",
  protect,
  allowRoles(...crmDeleteRoles),
  deletePipelineItem
);

/* Google Sheets Sync */
router.post(
  "/leads/import-from-sheet",
  protect,
  allowRoles(...crmWriteRoles),
  importSheetLeads
);

router.get(
  "/leads/sheet-status",
  protect,
  allowRoles(...crmReadRoles),
  getSheetConnectionStatus
);

export default router;
