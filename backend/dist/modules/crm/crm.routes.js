"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const crm_controller_1 = require("./crm.controller");
const router = (0, express_1.Router)();
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
router.get("/dashboard", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmReadRoles), crm_controller_1.getCrmDashboard);
/* Leads */
router.get("/leads", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmReadRoles), crm_controller_1.getLeads);
router.post("/leads", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.createLead);
router.get("/leads/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmReadRoles), crm_controller_1.getLeadById);
router.put("/leads/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.updateLead);
router.delete("/leads/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmDeleteRoles), crm_controller_1.deleteLead);
router.post("/leads/:id/convert", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.convertLeadToClient);
/* Clients */
router.get("/clients", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmReadRoles), crm_controller_1.getClients);
router.post("/clients", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.createClient);
router.get("/clients/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmReadRoles), crm_controller_1.getClientById);
router.put("/clients/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.updateClient);
router.delete("/clients/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmDeleteRoles), crm_controller_1.deleteClient);
/* Client Contacts */
router.post("/clients/:clientId/contacts", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.createClientContact);
router.put("/contacts/:contactId", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.updateClientContact);
router.delete("/contacts/:contactId", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmDeleteRoles), crm_controller_1.deleteClientContact);
/* Follow Ups */
router.get("/follow-ups", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmReadRoles), crm_controller_1.getFollowUps);
router.post("/follow-ups", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.createFollowUp);
router.put("/follow-ups/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.updateFollowUp);
router.put("/follow-ups/:id/complete", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.completeFollowUp);
router.delete("/follow-ups/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmDeleteRoles), crm_controller_1.deleteFollowUp);
/* Sales Pipeline */
router.get("/sales-pipeline", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmReadRoles), crm_controller_1.getSalesPipeline);
router.post("/sales-pipeline", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.createPipelineItem);
router.put("/sales-pipeline/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.updatePipelineItem);
router.put("/sales-pipeline/:id/stage", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.updatePipelineStage);
router.delete("/sales-pipeline/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmDeleteRoles), crm_controller_1.deletePipelineItem);
/* Google Sheets Sync */
router.post("/leads/sync-to-sheet", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.syncLeadsToSheet);
router.post("/leads/import-from-sheet", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmWriteRoles), crm_controller_1.importSheetLeads);
router.get("/leads/sheet-status", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...crmReadRoles), crm_controller_1.getSheetConnectionStatus);
exports.default = router;
