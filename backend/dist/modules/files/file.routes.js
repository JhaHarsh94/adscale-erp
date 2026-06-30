"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const file_controller_1 = require("./file.controller");
const router = (0, express_1.Router)();
const readRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const writeRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const adminRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"];
/* Folders */
router.get("/folders", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...readRoles), file_controller_1.listFolders);
router.get("/folders/tree", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...readRoles), file_controller_1.getFolderTree);
router.post("/folders", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...writeRoles), file_controller_1.createFolder);
router.put("/folders/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...writeRoles), file_controller_1.renameFolder);
router.delete("/folders/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...adminRoles), file_controller_1.deleteFolder);
/* Files */
router.get("/", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...readRoles), file_controller_1.listFiles);
router.post("/upload", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...writeRoles), file_controller_1.upload.single("file"), file_controller_1.uploadFile);
router.get("/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...readRoles), file_controller_1.getFile);
router.put("/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...writeRoles), file_controller_1.updateFile);
router.delete("/:id", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...adminRoles), file_controller_1.deleteFile);
router.get("/:id/download", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...readRoles), file_controller_1.downloadFile);
/* Versions */
router.get("/:id/versions", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...readRoles), file_controller_1.listVersions);
router.post("/:id/versions", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...writeRoles), file_controller_1.upload.single("file"), file_controller_1.uploadVersion);
/* Activity */
router.get("/activity/list", auth_middleware_1.protect, (0, auth_middleware_1.allowRoles)(...readRoles), file_controller_1.listActivity);
exports.default = router;
