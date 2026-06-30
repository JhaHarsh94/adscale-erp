"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const ticket_controller_1 = require("./ticket.controller");
const router = (0, express_1.Router)();
const ticketReadRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const ticketWriteRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "SALES_MANAGER"];
const ticketAdminRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"];
/* Categories */
router.get("/categories", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketReadRoles), ticket_controller_1.categoriesList);
router.post("/categories", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketAdminRoles), ticket_controller_1.categoriesCreate);
router.put("/categories/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketAdminRoles), ticket_controller_1.categoriesUpdate);
router.delete("/categories/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketAdminRoles), ticket_controller_1.categoriesDelete);
/* Dashboard */
router.get("/dashboard", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketReadRoles), ticket_controller_1.ticketsDashboard);
/* Tickets */
router.get("/", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketReadRoles), ticket_controller_1.ticketsList);
router.post("/", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketWriteRoles), ticket_controller_1.ticketsCreate);
router.get("/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketReadRoles), ticket_controller_1.ticketsGetOne);
router.put("/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketWriteRoles), ticket_controller_1.ticketsUpdate);
router.post("/:id/status", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketWriteRoles), ticket_controller_1.ticketsChangeStatus);
router.post("/:id/assign", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketWriteRoles), ticket_controller_1.ticketsAssign);
/* Comments */
router.get("/:id/comments", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketReadRoles), ticket_controller_1.ticketCommentsList);
router.post("/:id/comments", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketWriteRoles), ticket_controller_1.ticketCommentsCreate);
/* SLA */
router.post("/:id/sla", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...ticketAdminRoles), ticket_controller_1.ticketsSlaEvent);
exports.default = router;
