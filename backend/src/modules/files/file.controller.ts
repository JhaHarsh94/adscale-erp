import path from "path";
import type { Prisma } from "@prisma/client";
import { Response } from "express";
import multer from "multer";
import prisma from "../../config/prisma";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";

const clean = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str || null;
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, "../../../uploads")),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
});
export const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const folderInclude: Prisma.FolderInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  _count: { select: { files: true, children: true } },
};

const fileInclude: Prisma.FileInclude = {
  uploadedBy: { select: { id: true, name: true, email: true } },
  folder: { select: { id: true, name: true } },
  versions: { orderBy: { versionNumber: "desc" }, take: 5 },
  _count: { select: { versions: true, activity: true } },
};

/* ---- FOLDERS ---- */

export const listFolders = asyncHandler(async (req, res) => {
  const where: Prisma.FolderWhereInput = { parentId: clean(req.query.parentId) || null, isActive: true };
  if (req.query.projectId) where.projectId = String(req.query.projectId);
  if (req.query.clientId) where.clientId = String(req.query.clientId);
  const folders = await prisma.folder.findMany({ where, include: folderInclude, orderBy: { name: "asc" } });
  return successResponse(res, 200, "Folders fetched", folders);
});

export const getFolderTree = asyncHandler(async (_req, res) => {
  const all = await prisma.folder.findMany({ where: { isActive: true }, include: { _count: { select: { files: true, children: true } } }, orderBy: { name: "asc" } });
  const map = new Map<string, typeof all[0] & { children: typeof all }>();
  const roots: typeof all = [];
  for (const f of all) map.set(f.id, { ...f, children: [] });
  for (const f of all) {
    if (f.parentId && map.has(f.parentId)) map.get(f.parentId)!.children.push(map.get(f.id)!);
    else roots.push(map.get(f.id)!);
  }
  return successResponse(res, 200, "Folder tree fetched", roots);
});

export const createFolder = asyncHandler(async (req, res) => {
  const name = clean(req.body.name);
  if (!name) throw new AppError("Folder name is required", 400);
  const user = (req as AuthRequest).user;
  const parentId = clean(req.body.parentId);
  const folder = await prisma.folder.create({
    data: {
      name,
      parent: parentId ? { connect: { id: parentId } } : undefined,
      projectId: clean(req.body.projectId),
      clientId: clean(req.body.clientId),
      createdBy: user ? { connect: { id: user.id } } : undefined,
    },
    include: folderInclude,
  });
  await prisma.fileActivityLog.create({
    data: { folderId: folder.id, action: "CREATE_FOLDER", details: `Created folder "${name}"`, userId: user?.id },
  });
  return successResponse(res, 201, "Folder created", folder);
});

export const renameFolder = asyncHandler(async (req, res) => {
  const name = clean(req.body.name);
  if (!name) throw new AppError("Folder name is required", 400);
  const user = (req as AuthRequest).user;
  const folder = await prisma.folder.update({ where: { id: req.params.id }, data: { name }, include: folderInclude });
  await prisma.fileActivityLog.create({
    data: { folderId: folder.id, action: "RENAME_FOLDER", details: `Renamed to "${name}"`, userId: user?.id },
  });
  return successResponse(res, 200, "Folder renamed", folder);
});

export const deleteFolder = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id }, include: { _count: { select: { files: true, children: true } } } });
  if (!folder) throw new AppError("Folder not found", 404);
  if (folder._count.files > 0 || folder._count.children > 0) throw new AppError("Folder is not empty", 400);
  await prisma.folder.delete({ where: { id: req.params.id } });
  await prisma.fileActivityLog.create({
    data: { action: "DELETE_FOLDER", details: `Deleted folder "${folder.name}"`, userId: user?.id },
  });
  return successResponse(res, 200, "Folder deleted");
});

/* ---- FILES ---- */

export const listFiles = asyncHandler(async (req, res) => {
  const where: Prisma.FileWhereInput = {};
  if (req.query.folderId) where.folderId = String(req.query.folderId);
  if (req.query.projectId) where.projectId = String(req.query.projectId);
  if (req.query.clientId) where.clientId = String(req.query.clientId);
  if (req.query.search) where.name = { contains: String(req.query.search), mode: "insensitive" };
  const files = await prisma.file.findMany({ where, include: fileInclude, orderBy: { createdAt: "desc" } });
  return successResponse(res, 200, "Files fetched", files);
});

export const getFile = asyncHandler(async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: req.params.id }, include: fileInclude });
  if (!file) throw new AppError("File not found", 404);
  return successResponse(res, 200, "File fetched", file);
});

export const uploadFile = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const multerFile = (req as any).file;
  if (!multerFile) throw new AppError("No file uploaded", 400);

  const folderId = clean(req.body.folderId);
  const file = await prisma.file.create({
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

  await prisma.fileVersion.create({
    data: { fileId: file.id, versionNumber: 1, fileUrl: file.fileUrl, fileType: file.fileType, fileSize: file.fileSize, uploadedById: user?.id || null, notes: "Initial upload" },
  });

  await prisma.fileActivityLog.create({
    data: { fileId: file.id, action: "UPLOAD", details: `Uploaded "${file.name}"`, userId: user?.id },
  });

  return successResponse(res, 201, "File uploaded", file);
});

export const updateFile = asyncHandler(async (req, res) => {
  const data: Prisma.FileUpdateInput = {};
  if (req.body.name) data.name = clean(req.body.name)!;
  if (req.body.folderId !== undefined) data.folder = req.body.folderId ? { connect: { id: req.body.folderId } } : { disconnect: true };
  const user = (req as AuthRequest).user;
  const file = await prisma.file.update({ where: { id: req.params.id }, data, include: fileInclude });
  await prisma.fileActivityLog.create({
    data: { fileId: file.id, action: "RENAME", details: `Updated file "${file.name}"`, userId: user?.id },
  });
  return successResponse(res, 200, "File updated", file);
});

export const deleteFile = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  if (!file) throw new AppError("File not found", 404);
  await prisma.file.delete({ where: { id: req.params.id } });
  await prisma.fileActivityLog.create({
    data: { action: "DELETE", details: `Deleted file "${file.name}"`, userId: user?.id },
  });
  return successResponse(res, 200, "File deleted");
});

export const downloadFile = asyncHandler(async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  if (!file) throw new AppError("File not found", 404);
  const user = (req as AuthRequest).user;
  await prisma.fileActivityLog.create({
    data: { fileId: file.id, action: "DOWNLOAD", details: `Downloaded "${file.name}"`, userId: user?.id },
  });
  const filePath = path.join(__dirname, "../../../uploads", path.basename(file.fileUrl));
  return res.download(filePath, file.name);
});

/* ---- VERSIONS ---- */

export const listVersions = asyncHandler(async (req, res) => {
  const versions = await prisma.fileVersion.findMany({
    where: { fileId: req.params.id },
    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { versionNumber: "desc" },
  });
  return successResponse(res, 200, "Versions fetched", versions);
});

export const uploadVersion = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  if (!file) throw new AppError("File not found", 404);
  const multerFile = (req as any).file;
  if (!multerFile) throw new AppError("No file uploaded", 400);

  const newVersion = file.version + 1;
  const version = await prisma.fileVersion.create({
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

  await prisma.file.update({
    where: { id: file.id },
    data: { version: newVersion, fileUrl: version.fileUrl, fileType: version.fileType, fileSize: version.fileSize, mimeType: multerFile.mimetype },
  });

  await prisma.fileActivityLog.create({
    data: { fileId: file.id, action: "VERSION_UPLOAD", details: `Uploaded version ${newVersion}`, userId: user?.id },
  });

  return successResponse(res, 201, "Version uploaded", version);
});

/* ---- ACTIVITY ---- */

export const listActivity = asyncHandler(async (req, res) => {
  const where: Prisma.FileActivityLogWhereInput = {};
  if (req.query.fileId) where.fileId = String(req.query.fileId);
  const logs = await prisma.fileActivityLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return successResponse(res, 200, "Activity fetched", logs);
});
