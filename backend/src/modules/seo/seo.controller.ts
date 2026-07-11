import prisma from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";

const GOOGLE_SUGGEST = "https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=in&q=";

const projectInclude = { select: { id: true, name: true } };

/* ─── Dashboard ─── */
export const getSeoDashboard = asyncHandler(async (req, res) => {
  const [totalProjects, totalKeywords, keywordStats, totalAudits, recentAudits] = await Promise.all([
    prisma.seoProject.count(),
    prisma.seoKeyword.count(),
    prisma.seoKeyword.aggregate({
      _avg: { currentPosition: true },
      _min: { currentPosition: true },
      _max: { currentPosition: true },
    }),
    prisma.seoAudit.count(),
    prisma.seoAudit.findMany({
      take: 5,
      orderBy: { performedAt: "desc" },
      include: {
        seoProject: { select: { id: true, domain: true, project: projectInclude } },
        performedBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  return successResponse(res, 200, "SEO dashboard", {
    totalProjects,
    totalKeywords,
    avgPosition: Math.round(keywordStats._avg.currentPosition || 0),
    bestPosition: keywordStats._min.currentPosition,
    worstPosition: keywordStats._max.currentPosition,
    totalAudits,
    recentAudits,
  });
});

/* ─── SEO Projects ─── */
export const listSeoProjects = asyncHandler(async (req, res) => {
  const projects = await prisma.seoProject.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
      _count: { select: { keywords: true, audits: true, backlinks: true } },
    },
  });
  return successResponse(res, 200, "SEO projects", projects);
});

export const getSeoProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const project = await prisma.seoProject.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
      keywords: { orderBy: { trackedSince: "desc" } },
      audits: { orderBy: { performedAt: "desc" }, include: { performedBy: { select: { id: true, name: true } } } },
      backlinks: { orderBy: { discoveredAt: "desc" } },
    },
  });
  if (!project) throw new AppError("SEO project not found", 404);
  return successResponse(res, 200, "SEO project", project);
});

export const createSeoProject = asyncHandler(async (req, res) => {
  const { projectId, domain, targetCity, targetCountry, notes } = req.body;
  if (!projectId || !domain) throw new AppError("projectId and domain are required", 400);

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError("Project not found", 404);

  const existing = await prisma.seoProject.findUnique({ where: { projectId } });
  if (existing) throw new AppError("SEO project already exists for this project", 409);

  const seoProject = await prisma.seoProject.create({
    data: { projectId, domain, targetCity: targetCity || null, targetCountry: targetCountry || null, notes: notes || null },
    include: {
      project: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
      _count: { select: { keywords: true, audits: true, backlinks: true } },
    },
  });
  return successResponse(res, 201, "SEO project created", seoProject);
});

export const updateSeoProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { domain, targetCity, targetCountry, notes } = req.body;
  const seoProject = await prisma.seoProject.update({
    where: { id },
    data: { domain, targetCity, targetCountry, notes },
  });
  return successResponse(res, 200, "SEO project updated", seoProject);
});

export const deleteSeoProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.seoProject.delete({ where: { id } });
  return successResponse(res, 200, "SEO project deleted");
});

/* ─── Keywords ─── */
export const listKeywords = asyncHandler(async (req, res) => {
  const { seoProjectId } = req.query;
  const where: Record<string, unknown> = {};
  if (seoProjectId) where.seoProjectId = String(seoProjectId);
  const keywords = await prisma.seoKeyword.findMany({
    where,
    orderBy: { trackedSince: "desc" },
    include: { seoProject: { select: { id: true, domain: true } } },
  });
  return successResponse(res, 200, "Keywords", keywords);
});

export const createKeyword = asyncHandler(async (req, res) => {
  const { seoProjectId, keyword, searchVolume, keywordDifficulty } = req.body;
  if (!seoProjectId || !keyword) throw new AppError("seoProjectId and keyword are required", 400);
  const seoProject = await prisma.seoProject.findUnique({ where: { id: seoProjectId } });
  if (!seoProject) throw new AppError("SEO project not found", 404);
  const kw = await prisma.seoKeyword.create({
    data: {
      seoProjectId,
      keyword,
      searchVolume: searchVolume ? Number(searchVolume) : null,
      keywordDifficulty: keywordDifficulty ? Number(keywordDifficulty) : null,
    },
  });
  return successResponse(res, 201, "Keyword created", kw);
});

export const updateKeyword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { currentPosition, searchVolume, keywordDifficulty } = req.body;
  const data: Record<string, unknown> = {};
  if (currentPosition !== undefined) data.currentPosition = Number(currentPosition);
  if (searchVolume !== undefined) data.searchVolume = Number(searchVolume);
  if (keywordDifficulty !== undefined) data.keywordDifficulty = Number(keywordDifficulty);
  data.lastChecked = new Date();

  const old = await prisma.seoKeyword.findUnique({ where: { id } });
  if (!old) throw new AppError("Keyword not found", 404);

  if (currentPosition !== undefined && old.currentPosition !== null && Number(currentPosition) !== old.currentPosition) {
    data.previousPosition = old.currentPosition;
  }
  if (currentPosition !== undefined && (old.bestPosition === null || Number(currentPosition) < old.bestPosition)) {
    data.bestPosition = Number(currentPosition);
  }

  const kw = await prisma.seoKeyword.update({ where: { id }, data });
  return successResponse(res, 200, "Keyword updated", kw);
});

export const deleteKeyword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.seoKeyword.delete({ where: { id } });
  return successResponse(res, 200, "Keyword deleted");
});

/* ─── Audits ─── */
export const listAudits = asyncHandler(async (req, res) => {
  const { seoProjectId } = req.query;
  const where: Record<string, unknown> = {};
  if (seoProjectId) where.seoProjectId = String(seoProjectId);
  const audits = await prisma.seoAudit.findMany({
    where,
    orderBy: { performedAt: "desc" },
    include: {
      seoProject: { select: { id: true, domain: true } },
      performedBy: { select: { id: true, name: true } },
    },
  });
  return successResponse(res, 200, "Audits", audits);
});

export const createAudit = asyncHandler(async (req, res) => {
  const { seoProjectId, score, totalIssues, criticalIssues, passedChecks, warnings, summary } = req.body;
  if (!seoProjectId) throw new AppError("seoProjectId is required", 400);
  const audit = await prisma.seoAudit.create({
    data: {
      seoProjectId,
      score: score !== undefined ? Number(score) : null,
      totalIssues: totalIssues !== undefined ? Number(totalIssues) : null,
      criticalIssues: criticalIssues !== undefined ? Number(criticalIssues) : null,
      passedChecks: passedChecks !== undefined ? Number(passedChecks) : null,
      warnings: warnings !== undefined ? Number(warnings) : null,
      summary: summary || null,
      performedById: req.user?.id,
    },
  });
  return successResponse(res, 201, "Audit created", audit);
});

export const deleteAudit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.seoAudit.delete({ where: { id } });
  return successResponse(res, 200, "Audit deleted");
});

/* ─── Backlinks ─── */
export const listBacklinks = asyncHandler(async (req, res) => {
  const { seoProjectId } = req.query;
  const where: Record<string, unknown> = {};
  if (seoProjectId) where.seoProjectId = String(seoProjectId);
  const backlinks = await prisma.seoBacklink.findMany({
    where,
    orderBy: { discoveredAt: "desc" },
    include: { seoProject: { select: { id: true, domain: true } } },
  });
  return successResponse(res, 200, "Backlinks", backlinks);
});

export const createBacklink = asyncHandler(async (req, res) => {
  const { seoProjectId, sourceUrl, targetUrl, domainAuthority, isFollow } = req.body;
  if (!seoProjectId || !sourceUrl) throw new AppError("seoProjectId and sourceUrl are required", 400);
  const bl = await prisma.seoBacklink.create({
    data: {
      seoProjectId,
      sourceUrl,
      targetUrl: targetUrl || null,
      domainAuthority: domainAuthority !== undefined ? Number(domainAuthority) : null,
      isFollow: isFollow !== undefined ? Boolean(isFollow) : true,
    },
  });
  return successResponse(res, 201, "Backlink created", bl);
});

export const updateBacklink = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { domainAuthority, status, isFollow } = req.body;
  const data: Record<string, unknown> = {};
  if (domainAuthority !== undefined) data.domainAuthority = Number(domainAuthority);
  if (status !== undefined) data.status = String(status);
  if (isFollow !== undefined) data.isFollow = Boolean(isFollow);
  data.lastChecked = new Date();
  const bl = await prisma.seoBacklink.update({ where: { id }, data });
  return successResponse(res, 200, "Backlink updated", bl);
});

export const deleteBacklink = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.seoBacklink.delete({ where: { id } });
  return successResponse(res, 200, "Backlink deleted");
});

/* ─── Projects without SEO ─── */
/* ─── Keyword Suggestions ─── */
export const suggestKeywords = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || String(q).length < 2) throw new AppError("Query must be at least 2 characters", 400);
  try {
    const response = await fetch(`${GOOGLE_SUGGEST}${encodeURIComponent(String(q))}`);
    const data = await response.json();
    const suggestions: string[] = data[1]?.map((item: string[]) => item[0]) || [];
    return successResponse(res, 200, "Keyword suggestions", suggestions);
  } catch {
    throw new AppError("Failed to fetch suggestions", 502);
  }
});

export const getProjectsWithoutSeo = asyncHandler(async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { seo: null },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
  return successResponse(res, 200, "Projects without SEO", projects);
});
