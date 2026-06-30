import { KnowledgeArticleStatus, type Prisma } from "@prisma/client";
import { Response } from "express";
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
const enumValue = <T extends Record<string, string>>(values: T, value: unknown, fallback: T[keyof T]) =>
  Object.values(values).includes(String(value)) ? String(value) as T[keyof T] : fallback;

const userSelect = { id: true, name: true, email: true };

const articleInclude: Prisma.KnowledgeArticleInclude = {
  category: true,
  createdBy: { select: userSelect },
  files: { orderBy: { sortOrder: "asc" } },
  _count: { select: { views: true } },
};

const categoryInclude: Prisma.KnowledgeCategoryInclude = {
  _count: { select: { articles: true } },
  children: { include: { _count: { select: { articles: true } } }, orderBy: { sortOrder: "asc" } },
};

async function article(id: string) {
  const result = await prisma.knowledgeArticle.findUnique({ where: { id }, include: articleInclude });
  if (!result) throw new AppError("Article not found", 404);
  return result;
}

/* ─── Categories ─── */

export const listCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.knowledgeCategory.findMany({
    where: { parentId: null },
    include: categoryInclude,
    orderBy: { sortOrder: "asc" },
  });
  return successResponse(res, 200, "Categories fetched", categories);
});

export const createCategory = asyncHandler(async (req, res) => {
  const name = clean(req.body.name);
  if (!name) throw new AppError("Category name is required", 400);
  const category = await prisma.knowledgeCategory.create({
    data: {
      name,
      description: clean(req.body.description),
      icon: clean(req.body.icon),
      sortOrder: req.body.sortOrder ?? 0,
      parentId: clean(req.body.parentId),
    },
    include: categoryInclude,
  });
  return successResponse(res, 201, "Category created", category);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const data: Prisma.KnowledgeCategoryUpdateInput = {};
  if (req.body.name) data.name = clean(req.body.name)!;
  if (req.body.description !== undefined) data.description = clean(req.body.description) || undefined;
  if (req.body.icon !== undefined) data.icon = clean(req.body.icon) || undefined;
  if (req.body.sortOrder !== undefined) data.sortOrder = req.body.sortOrder;
  if (req.body.parentId !== undefined) data.parent = req.body.parentId ? { connect: { id: req.body.parentId } } : { disconnect: true };
  const category = await prisma.knowledgeCategory.update({
    where: { id: req.params.id },
    data,
    include: categoryInclude,
  });
  return successResponse(res, 200, "Category updated", category);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await prisma.knowledgeCategory.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, "Category deleted");
});

/* ─── Articles ─── */

export const listArticles = asyncHandler(async (req, res) => {
  const where: Prisma.KnowledgeArticleWhereInput = {};
  if (req.query.categoryId) where.categoryId = String(req.query.categoryId);
  if (req.query.status) where.status = enumValue(KnowledgeArticleStatus, req.query.status, KnowledgeArticleStatus.PUBLISHED);
  else where.status = "PUBLISHED";
  if (req.query.search) {
    where.OR = [
      { title: { contains: String(req.query.search), mode: "insensitive" } },
      { content: { contains: String(req.query.search), mode: "insensitive" } },
    ];
  }
  const articles = await prisma.knowledgeArticle.findMany({
    where,
    include: articleInclude,
    orderBy: { createdAt: "desc" },
  });
  return successResponse(res, 200, "Articles fetched", articles);
});

export const getArticle = asyncHandler(async (req, res) => {
  const result = await article(req.params.id);
  return successResponse(res, 200, "Article fetched", result);
});

export const createArticle = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  const title = clean(req.body.title);
  if (!title) throw new AppError("Title is required", 400);

  const categoryId = clean(req.body.categoryId);
  const result = await prisma.knowledgeArticle.create({
    data: {
      title,
      content: req.body.content || null,
      status: enumValue(KnowledgeArticleStatus, req.body.status, KnowledgeArticleStatus.DRAFT),
      category: categoryId ? { connect: { id: categoryId } } : undefined,
      tags: clean(req.body.tags),
      createdBy: { connect: { id: user?.id } },
      publishedAt: req.body.status === "PUBLISHED" ? new Date() : null,
      files: {
        create: (req.body.files || []).map((f: { name: string; fileUrl: string; fileType?: string; fileSize?: number; isVideo?: boolean }, idx: number) => ({
          name: f.name,
          fileUrl: f.fileUrl,
          fileType: f.fileType,
          fileSize: f.fileSize,
          isVideo: f.isVideo ?? false,
          sortOrder: idx,
        })),
      },
    },
    include: articleInclude,
  });
  return successResponse(res, 201, "Article created", result);
});

export const updateArticle = asyncHandler(async (req, res) => {
  const current = await article(req.params.id);
  const data: Prisma.KnowledgeArticleUpdateInput = {};
  if (req.body.title) data.title = clean(req.body.title)!;
  if (req.body.content !== undefined) data.content = req.body.content || null;
  if (req.body.status) {
    data.status = enumValue(KnowledgeArticleStatus, req.body.status, current.status);
    if (req.body.status === "PUBLISHED" && current.status !== "PUBLISHED") data.publishedAt = new Date();
  }
  if (req.body.categoryId !== undefined) data.category = req.body.categoryId ? { connect: { id: req.body.categoryId } } : { disconnect: true };
  if (req.body.tags !== undefined) data.tags = clean(req.body.tags) || undefined;

  const result = await prisma.knowledgeArticle.update({
    where: { id: req.params.id },
    data,
    include: articleInclude,
  });
  return successResponse(res, 200, "Article updated", result);
});

export const deleteArticle = asyncHandler(async (req, res) => {
  await article(req.params.id);
  await prisma.knowledgeArticle.delete({ where: { id: req.params.id } });
  return successResponse(res, 200, "Article deleted");
});

export const publishArticle = asyncHandler(async (req, res) => {
  const current = await article(req.params.id);
  if (current.status === "PUBLISHED") throw new AppError("Article is already published", 400);
  const result = await prisma.knowledgeArticle.update({
    where: { id: req.params.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
    include: articleInclude,
  });
  return successResponse(res, 200, "Article published", result);
});

export const archiveArticle = asyncHandler(async (req, res) => {
  const result = await prisma.knowledgeArticle.update({
    where: { id: req.params.id },
    data: { status: "ARCHIVED" },
    include: articleInclude,
  });
  return successResponse(res, 200, "Article archived", result);
});

/* ─── Article Files ─── */

export const addFile = asyncHandler(async (req, res) => {
  await article(req.params.id);
  const name = clean(req.body.name);
  if (!name || !req.body.fileUrl) throw new AppError("Name and fileUrl are required", 400);
  const file = await prisma.knowledgeFile.create({
    data: {
      articleId: req.params.id,
      name,
      fileUrl: req.body.fileUrl,
      fileType: clean(req.body.fileType),
      fileSize: req.body.fileSize || null,
      isVideo: req.body.isVideo ?? false,
      sortOrder: req.body.sortOrder ?? 0,
    },
  });
  return successResponse(res, 201, "File added", file);
});

export const deleteFile = asyncHandler(async (req, res) => {
  const file = await prisma.knowledgeFile.findUnique({ where: { id: req.params.fileId } });
  if (!file) throw new AppError("File not found", 404);
  await prisma.knowledgeFile.delete({ where: { id: req.params.fileId } });
  return successResponse(res, 200, "File deleted");
});

/* ─── View tracking ─── */

export const trackView = asyncHandler(async (req, res) => {
  const user = (req as AuthRequest).user;
  await article(req.params.id);
  await prisma.knowledgeView.create({
    data: { articleId: req.params.id, userId: user?.id },
  });
  const count = await prisma.knowledgeView.count({ where: { articleId: req.params.id } });
  return successResponse(res, 200, "View tracked", { views: count });
});

/* ─── Dashboard ─── */

export const dashboard = asyncHandler(async (req, res) => {
  const [totalArticles, totalCategories, published, drafts, totalViews] = await Promise.all([
    prisma.knowledgeArticle.count(),
    prisma.knowledgeCategory.count(),
    prisma.knowledgeArticle.count({ where: { status: "PUBLISHED" } }),
    prisma.knowledgeArticle.count({ where: { status: "DRAFT" } }),
    prisma.knowledgeView.count(),
  ]);
  return successResponse(res, 200, "Knowledge base dashboard", { totalArticles, totalCategories, published, drafts, totalViews });
});
