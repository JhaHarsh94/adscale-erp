"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listActivity = exports.uploadVersion = exports.listVersions = exports.downloadFile = exports.deleteFile = exports.updateFile = exports.uploadFile = exports.getFile = exports.listFiles = exports.deleteFolder = exports.renameFolder = exports.createFolder = exports.getFolderTree = exports.listFolders = exports.upload = void 0;
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const prisma_1 = __importDefault(require("../../config/prisma"));
const AppError_1 = require("../../utils/AppError");
const asyncHandler_1 = require("../../utils/asyncHandler");
const response_1 = require("../../utils/response");
const clean = (value) => {
    if (value === null || value === undefined)
        return null;
    const str = String(value).trim();
    return str || null;
};
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, path_1.default.join(__dirname, "../../../uploads")),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});
exports.upload = (0, multer_1.default)({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
const folderInclude = {
    createdBy: { select: { id: true, name: true, email: true } },
    _count: { select: { files: true, children: true } },
};
const fileInclude = {
    uploadedBy: { select: { id: true, name: true, email: true } },
    folder: { select: { id: true, name: true } },
    versions: { orderBy: { versionNumber: "desc" }, take: 5 },
    _count: { select: { versions: true, activity: true } },
};
/* ---- FOLDERS ---- */
exports.listFolders = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const where = { parentId: clean(req.query.parentId) || null, isActive: true };
    if (req.query.projectId)
        where.projectId = String(req.query.projectId);
    if (req.query.clientId)
        where.clientId = String(req.query.clientId);
    const folders = await prisma_1.default.folder.findMany({ where, include: folderInclude, orderBy: { name: "asc" } });
    return (0, response_1.successResponse)(res, 200, "Folders fetched", folders);
});
exports.getFolderTree = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const all = await prisma_1.default.folder.findMany({ where: { isActive: true }, include: { _count: { select: { files: true, children: true } } }, orderBy: { name: "asc" } });
    const map = new Map();
    const roots = [];
    for (const f of all)
        map.set(f.id, { ...f, children: [] });
    for (const f of all) {
        if (f.parentId && map.has(f.parentId))
            map.get(f.parentId).children.push(map.get(f.id));
        else
            roots.push(map.get(f.id));
    }
    return (0, response_1.successResponse)(res, 200, "Folder tree fetched", roots);
});
exports.createFolder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const name = clean(req.body.name);
    if (!name)
        throw new AppError_1.AppError("Folder name is required", 400);
    const user = req.user;
    const parentId = clean(req.body.parentId);
    const folder = await prisma_1.default.folder.create({
        data: {
            name,
            parent: parentId ? { connect: { id: parentId } } : undefined,
            projectId: clean(req.body.projectId),
            clientId: clean(req.body.clientId),
            createdBy: user ? { connect: { id: user.id } } : undefined,
        },
        include: folderInclude,
    });
    await prisma_1.default.fileActivityLog.create({
        data: { folderId: folder.id, action: "CREATE_FOLDER", details: `Created folder "${name}"`, userId: user?.id },
    });
    return (0, response_1.successResponse)(res, 201, "Folder created", folder);
});
exports.renameFolder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const name = clean(req.body.name);
    if (!name)
        throw new AppError_1.AppError("Folder name is required", 400);
    const user = req.user;
    const folder = await prisma_1.default.folder.update({ where: { id: req.params.id }, data: { name }, include: folderInclude });
    await prisma_1.default.fileActivityLog.create({
        data: { folderId: folder.id, action: "RENAME_FOLDER", details: `Renamed to "${name}"`, userId: user?.id },
    });
    return (0, response_1.successResponse)(res, 200, "Folder renamed", folder);
});
exports.deleteFolder = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const folder = await prisma_1.default.folder.findUnique({ where: { id: req.params.id }, include: { _count: { select: { files: true, children: true } } } });
    if (!folder)
        throw new AppError_1.AppError("Folder not found", 404);
    if (folder._count.files > 0 || folder._count.children > 0)
        throw new AppError_1.AppError("Folder is not empty", 400);
    await prisma_1.default.folder.delete({ where: { id: req.params.id } });
    await prisma_1.default.fileActivityLog.create({
        data: { action: "DELETE_FOLDER", details: `Deleted folder "${folder.name}"`, userId: user?.id },
    });
    return (0, response_1.successResponse)(res, 200, "Folder deleted");
});
/* ---- FILES ---- */
exports.listFiles = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const where = {};
    if (req.query.folderId)
        where.folderId = String(req.query.folderId);
    if (req.query.projectId)
        where.projectId = String(req.query.projectId);
    if (req.query.clientId)
        where.clientId = String(req.query.clientId);
    if (req.query.search)
        where.name = { contains: String(req.query.search), mode: "insensitive" };
    const files = await prisma_1.default.file.findMany({ where, include: fileInclude, orderBy: { createdAt: "desc" } });
    return (0, response_1.successResponse)(res, 200, "Files fetched", files);
});
exports.getFile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const file = await prisma_1.default.file.findUnique({ where: { id: req.params.id }, include: fileInclude });
    if (!file)
        throw new AppError_1.AppError("File not found", 404);
    return (0, response_1.successResponse)(res, 200, "File fetched", file);
});
exports.uploadFile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const multerFile = req.file;
    if (!multerFile)
        throw new AppError_1.AppError("No file uploaded", 400);
    const folderId = clean(req.body.folderId);
    const file = await prisma_1.default.file.create({
        data: {
            name: multerFile.originalname,
            folder: folderId ? { connect: { id: folderId } } : undefined,
            projectId: clean(req.body.projectId),
            clientId: clean(req.body.clientId),
            fileUrl: `/uploads/${multerFile.filename}`,
            fileType: multerFile.mimetype,
            fileSize: multerFile.size,
            mimeType: multerFile.mimetype,
            version: 1,
            uploadedBy: user ? { connect: { id: user.id } } : undefined,
        },
        include: fileInclude,
    });
    await prisma_1.default.fileVersion.create({
        data: { fileId: file.id, versionNumber: 1, fileUrl: file.fileUrl, fileType: file.fileType, fileSize: file.fileSize, uploadedById: user?.id || null, notes: "Initial upload" },
    });
    await prisma_1.default.fileActivityLog.create({
        data: { fileId: file.id, action: "UPLOAD", details: `Uploaded "${file.name}"`, userId: user?.id },
    });
    return (0, response_1.successResponse)(res, 201, "File uploaded", file);
});
exports.updateFile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const data = {};
    if (req.body.name)
        data.name = clean(req.body.name);
    if (req.body.folderId !== undefined)
        data.folder = req.body.folderId ? { connect: { id: req.body.folderId } } : { disconnect: true };
    const user = req.user;
    const file = await prisma_1.default.file.update({ where: { id: req.params.id }, data, include: fileInclude });
    await prisma_1.default.fileActivityLog.create({
        data: { fileId: file.id, action: "RENAME", details: `Updated file "${file.name}"`, userId: user?.id },
    });
    return (0, response_1.successResponse)(res, 200, "File updated", file);
});
exports.deleteFile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const file = await prisma_1.default.file.findUnique({ where: { id: req.params.id } });
    if (!file)
        throw new AppError_1.AppError("File not found", 404);
    await prisma_1.default.file.delete({ where: { id: req.params.id } });
    await prisma_1.default.fileActivityLog.create({
        data: { action: "DELETE", details: `Deleted file "${file.name}"`, userId: user?.id },
    });
    return (0, response_1.successResponse)(res, 200, "File deleted");
});
exports.downloadFile = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const file = await prisma_1.default.file.findUnique({ where: { id: req.params.id } });
    if (!file)
        throw new AppError_1.AppError("File not found", 404);
    const user = req.user;
    await prisma_1.default.fileActivityLog.create({
        data: { fileId: file.id, action: "DOWNLOAD", details: `Downloaded "${file.name}"`, userId: user?.id },
    });
    const filePath = path_1.default.join(__dirname, "../../../uploads", path_1.default.basename(file.fileUrl));
    return res.download(filePath, file.name);
});
/* ---- VERSIONS ---- */
exports.listVersions = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const versions = await prisma_1.default.fileVersion.findMany({
        where: { fileId: req.params.id },
        include: { uploadedBy: { select: { id: true, name: true, email: true } } },
        orderBy: { versionNumber: "desc" },
    });
    return (0, response_1.successResponse)(res, 200, "Versions fetched", versions);
});
exports.uploadVersion = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = req.user;
    const file = await prisma_1.default.file.findUnique({ where: { id: req.params.id } });
    if (!file)
        throw new AppError_1.AppError("File not found", 404);
    const multerFile = req.file;
    if (!multerFile)
        throw new AppError_1.AppError("No file uploaded", 400);
    const newVersion = file.version + 1;
    const version = await prisma_1.default.fileVersion.create({
        data: {
            fileId: file.id,
            versionNumber: newVersion,
            fileUrl: `/uploads/${multerFile.filename}`,
            fileType: multerFile.mimetype,
            fileSize: multerFile.size,
            uploadedById: user?.id || null,
            notes: clean(req.body.notes),
        },
    });
    await prisma_1.default.file.update({
        where: { id: file.id },
        data: { version: newVersion, fileUrl: version.fileUrl, fileType: version.fileType, fileSize: version.fileSize, mimeType: multerFile.mimetype },
    });
    await prisma_1.default.fileActivityLog.create({
        data: { fileId: file.id, action: "VERSION_UPLOAD", details: `Uploaded version ${newVersion}`, userId: user?.id },
    });
    return (0, response_1.successResponse)(res, 201, "Version uploaded", version);
});
/* ---- ACTIVITY ---- */
exports.listActivity = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const where = {};
    if (req.query.fileId)
        where.fileId = String(req.query.fileId);
    const logs = await prisma_1.default.fileActivityLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
    });
    return (0, response_1.successResponse)(res, 200, "Activity fetched", logs);
});
