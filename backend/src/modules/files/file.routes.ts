import { Router } from "express";
import { allowRoles, protect } from "../../middlewares/auth.middleware";
import {
  createFolder, deleteFile, deleteFolder, downloadFile, getFile, getFolderTree, listActivity, listFiles,
  listFolders, listVersions, renameFolder, updateFile, upload, uploadFile, uploadVersion,
} from "./file.controller";

const router = Router();

const readRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const writeRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD", "HR", "EMPLOYEE", "SALES_MANAGER"];
const adminRoles = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"];

/* Folders */
router.get("/folders", protect, allowRoles(...readRoles), listFolders);
router.get("/folders/tree", protect, allowRoles(...readRoles), getFolderTree);
router.post("/folders", protect, allowRoles(...writeRoles), createFolder);
router.put("/folders/:id", protect, allowRoles(...writeRoles), renameFolder);
router.delete("/folders/:id", protect, allowRoles(...adminRoles), deleteFolder);

/* Files */
router.get("/", protect, allowRoles(...readRoles), listFiles);
router.post("/upload", protect, allowRoles(...writeRoles), upload.single("file"), uploadFile);
router.get("/:id", protect, allowRoles(...readRoles), getFile);
router.put("/:id", protect, allowRoles(...writeRoles), updateFile);
router.delete("/:id", protect, allowRoles(...adminRoles), deleteFile);
router.get("/:id/download", protect, allowRoles(...readRoles), downloadFile);

/* Versions */
router.get("/:id/versions", protect, allowRoles(...readRoles), listVersions);
router.post("/:id/versions", protect, allowRoles(...writeRoles), upload.single("file"), uploadVersion);

/* Activity */
router.get("/activity/list", protect, allowRoles(...readRoles), listActivity);

export default router;
