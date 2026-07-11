import prisma from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";

const projectInclude = { select: { id: true, name: true, client: { select: { id: true, name: true } } } };

export const getDashboard = asyncHandler(async (req, res) => {
  const [totalAccounts, totalCampaigns, metrics] = await Promise.all([
    prisma.googleAdsAccount.count(),
    prisma.googleAdsCampaign.count(),
    prisma.googleAdsMetric.aggregate({
      _sum: { impressions: true, clicks: true, cost: true, conversions: true, conversionValue: true },
    }),
  ]);
  const recentCampaigns = await prisma.googleAdsCampaign.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { account: { select: { id: true, accountName: true, project: projectInclude } } },
  });
  return successResponse(res, 200, "Google Ads dashboard", {
    totalAccounts, totalCampaigns,
    totalImpressions: metrics._sum.impressions || 0,
    totalClicks: metrics._sum.clicks || 0,
    totalCost: metrics._sum.cost || 0,
    totalConversions: metrics._sum.conversions || 0,
    totalConversionValue: metrics._sum.conversionValue || 0,
    recentCampaigns,
  });
});

export const listAccounts = asyncHandler(async (req, res) => {
  const accounts = await prisma.googleAdsAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: projectInclude,
      _count: { select: { campaigns: true, keywords: true } },
    },
  });
  return successResponse(res, 200, "Google Ads accounts", accounts);
});

export const getAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const account = await prisma.googleAdsAccount.findUnique({
    where: { id },
    include: {
      project: projectInclude,
      campaigns: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { keywords: true, metrics: true } } },
      },
    },
  });
  if (!account) throw new AppError("Account not found", 404);
  return successResponse(res, 200, "Google Ads account", account);
});

export const createAccount = asyncHandler(async (req, res) => {
  const { projectId, accountName, accountId, currency, timezone } = req.body;
  if (!projectId || !accountName) throw new AppError("projectId and accountName are required", 400);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError("Project not found", 404);
  const account = await prisma.googleAdsAccount.create({
    data: { projectId, accountName, accountId: accountId || null, currency: currency || "INR", timezone: timezone || "Asia/Kolkata" },
    include: { project: projectInclude, _count: { select: { campaigns: true, keywords: true } } },
  });
  return successResponse(res, 201, "Account created", account);
});

export const updateAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data: Record<string, unknown> = {};
  ["accountName", "accountId", "currency", "timezone", "isActive"].forEach((k) => {
    if (req.body[k] !== undefined) data[k] = req.body[k];
  });
  const account = await prisma.googleAdsAccount.update({ where: { id }, data });
  return successResponse(res, 200, "Account updated", account);
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.googleAdsAccount.delete({ where: { id } });
  return successResponse(res, 200, "Account deleted");
});

export const listCampaigns = asyncHandler(async (req, res) => {
  const { accountId, status } = req.query;
  const where: Record<string, unknown> = {};
  if (accountId) where.accountId = String(accountId);
  if (status) where.status = String(status);
  const campaigns = await prisma.googleAdsCampaign.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      account: { select: { id: true, accountName: true, project: projectInclude } },
      _count: { select: { keywords: true, metrics: true } },
    },
  });
  return successResponse(res, 200, "Campaigns", campaigns);
});

export const getCampaign = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const campaign = await prisma.googleAdsCampaign.findUnique({
    where: { id },
    include: {
      account: { select: { id: true, accountName: true, project: projectInclude } },
      keywords: { orderBy: { createdAt: "desc" } },
      metrics: { orderBy: { date: "desc" }, take: 30 },
    },
  });
  if (!campaign) throw new AppError("Campaign not found", 404);
  return successResponse(res, 200, "Campaign", campaign);
});

export const createCampaign = asyncHandler(async (req, res) => {
  const { accountId, campaignName, campaignId, status, campaignType, dailyBudget, lifetimeBudget, startDate, endDate, targetCpa, targetRoas } = req.body;
  if (!accountId || !campaignName) throw new AppError("accountId and campaignName are required", 400);
  const campaign = await prisma.googleAdsCampaign.create({
    data: {
      accountId, campaignName, campaignId: campaignId || null,
      status: status || "ACTIVE", campaignType: campaignType || "SEARCH",
      dailyBudget: dailyBudget ? Number(dailyBudget) : null,
      lifetimeBudget: lifetimeBudget ? Number(lifetimeBudget) : null,
      startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null,
      targetCpa: targetCpa ? Number(targetCpa) : null,
      targetRoas: targetRoas ? Number(targetRoas) : null,
    },
    include: { account: { select: { id: true, accountName: true } } },
  });
  return successResponse(res, 201, "Campaign created", campaign);
});

export const updateCampaign = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data: Record<string, unknown> = {};
  ["campaignName", "campaignId", "status", "campaignType", "dailyBudget", "lifetimeBudget", "startDate", "endDate", "targetCpa", "targetRoas"].forEach((k) => {
    if (req.body[k] !== undefined) {
      if (k === "dailyBudget" || k === "lifetimeBudget" || k === "targetCpa" || k === "targetRoas") data[k] = Number(req.body[k]);
      else if (k === "startDate" || k === "endDate") data[k] = req.body[k] ? new Date(req.body[k]) : null;
      else data[k] = req.body[k];
    }
  });
  const campaign = await prisma.googleAdsCampaign.update({ where: { id }, data });
  return successResponse(res, 200, "Campaign updated", campaign);
});

export const deleteCampaign = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.googleAdsCampaign.delete({ where: { id } });
  return successResponse(res, 200, "Campaign deleted");
});

export const listKeywords = asyncHandler(async (req, res) => {
  const { campaignId, accountId, status } = req.query;
  const where: Record<string, unknown> = {};
  if (campaignId) where.campaignId = String(campaignId);
  if (accountId) where.accountId = String(accountId);
  if (status) where.status = String(status);
  const keywords = await prisma.googleAdsKeyword.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      campaign: { select: { id: true, campaignName: true } },
      account: { select: { id: true, accountName: true } },
    },
  });
  return successResponse(res, 200, "Keywords", keywords);
});

export const getKeyword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const keyword = await prisma.googleAdsKeyword.findUnique({
    where: { id },
    include: {
      campaign: { select: { id: true, campaignName: true } },
      account: { select: { id: true, accountName: true } },
    },
  });
  if (!keyword) throw new AppError("Keyword not found", 404);
  return successResponse(res, 200, "Keyword", keyword);
});

export const createKeyword = asyncHandler(async (req, res) => {
  const { campaignId, accountId, keyword, matchType, bidAmount, qualityScore, status } = req.body;
  if (!campaignId || !accountId || !keyword) throw new AppError("campaignId, accountId, and keyword are required", 400);
  const kw = await prisma.googleAdsKeyword.create({
    data: {
      campaignId, accountId, keyword,
      matchType: matchType || "PHRASE",
      bidAmount: bidAmount ? Number(bidAmount) : null,
      qualityScore: qualityScore !== undefined ? Number(qualityScore) : null,
      status: status || "ENABLED",
    },
    include: { campaign: { select: { id: true, campaignName: true } }, account: { select: { id: true, accountName: true } } },
  });
  return successResponse(res, 201, "Keyword created", kw);
});

export const updateKeyword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data: Record<string, unknown> = {};
  ["keyword", "matchType", "bidAmount", "qualityScore", "status"].forEach((k) => {
    if (req.body[k] !== undefined) {
      if (k === "bidAmount" || k === "qualityScore") data[k] = Number(req.body[k]);
      else data[k] = req.body[k];
    }
  });
  const kw = await prisma.googleAdsKeyword.update({ where: { id }, data });
  return successResponse(res, 200, "Keyword updated", kw);
});

export const deleteKeyword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.googleAdsKeyword.delete({ where: { id } });
  return successResponse(res, 200, "Keyword deleted");
});

export const listMetrics = asyncHandler(async (req, res) => {
  const { campaignId, keywordId, from, to } = req.query;
  const where: Record<string, unknown> = {};
  if (campaignId) where.campaignId = String(campaignId);
  if (keywordId) where.keywordId = String(keywordId);
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(String(from));
    if (to) (where.date as Record<string, unknown>).lte = new Date(String(to));
  }
  const metrics = await prisma.googleAdsMetric.findMany({
    where,
    orderBy: { date: "desc" },
  });
  return successResponse(res, 200, "Metrics", metrics);
});

export const upsertMetric = asyncHandler(async (req, res) => {
  const { campaignId, keywordId, date, impressions, clicks, cost, conversions, conversionValue, ctr, cpc, cpm, cpa, roas, averagePosition } = req.body;
  if (!campaignId || !date) throw new AppError("campaignId and date are required", 400);
  const uniqueWhere: Record<string, unknown> = { campaignId, date: new Date(date) };
  if (keywordId) uniqueWhere.keywordId = keywordId;
  if (!keywordId) uniqueWhere.keywordId = null;
  const metric = await prisma.googleAdsMetric.upsert({
    where: { campaignId_keywordId_date: uniqueWhere as any },
    update: {
      impressions: impressions !== undefined ? Number(impressions) : undefined,
      clicks: clicks !== undefined ? Number(clicks) : undefined,
      cost: cost !== undefined ? Number(cost) : undefined,
      conversions: conversions !== undefined ? Number(conversions) : undefined,
      conversionValue: conversionValue !== undefined ? Number(conversionValue) : undefined,
      ctr: ctr !== undefined ? Number(ctr) : undefined,
      cpc: cpc !== undefined ? Number(cpc) : undefined,
      cpm: cpm !== undefined ? Number(cpm) : undefined,
      cpa: cpa !== undefined ? Number(cpa) : undefined,
      roas: roas !== undefined ? Number(roas) : undefined,
      averagePosition: averagePosition !== undefined ? Number(averagePosition) : undefined,
    },
    create: {
      campaignId, keywordId: keywordId || null, date: new Date(date),
      impressions: Number(impressions || 0), clicks: Number(clicks || 0),
      cost: Number(cost || 0), conversions: Number(conversions || 0),
      conversionValue: conversionValue !== undefined ? Number(conversionValue) : null,
      ctr: ctr !== undefined ? Number(ctr) : null,
      cpc: cpc !== undefined ? Number(cpc) : null,
      cpm: cpm !== undefined ? Number(cpm) : null,
      cpa: cpa !== undefined ? Number(cpa) : null,
      roas: roas !== undefined ? Number(roas) : null,
      averagePosition: averagePosition !== undefined ? Number(averagePosition) : null,
    },
  });
  return successResponse(res, 200, "Metric saved", metric);
});

export const deleteMetric = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.googleAdsMetric.delete({ where: { id } });
  return successResponse(res, 200, "Metric deleted");
});

export const listReports = asyncHandler(async (req, res) => {
  const { accountId } = req.query;
  const where: Record<string, unknown> = {};
  if (accountId) where.accountId = String(accountId);
  const reports = await prisma.googleAdsReport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { account: { select: { id: true, accountName: true } } },
  });
  return successResponse(res, 200, "Reports", reports);
});

export const createReport = asyncHandler(async (req, res) => {
  const { accountId, title, periodStart, periodEnd, summary } = req.body;
  if (!accountId || !title) throw new AppError("accountId and title are required", 400);
  const account = await prisma.googleAdsAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new AppError("Account not found", 404);
  const whereClause: Record<string, unknown> = { campaign: { accountId } };
  if (periodStart) whereClause.date = { ...(whereClause.date as object || {}), gte: new Date(periodStart) };
  if (periodEnd) whereClause.date = { ...(whereClause.date as object || {}), lte: new Date(periodEnd) };
  const [agg] = await Promise.all([
    prisma.googleAdsMetric.aggregate({
      where: whereClause as any,
      _sum: { impressions: true, clicks: true, cost: true, conversions: true, conversionValue: true },
    }),
  ]);
  const imp = agg._sum.impressions || 0;
  const cost = agg._sum.cost || 0;
  const clicks = agg._sum.clicks || 0;
  const conversions = agg._sum.conversions || 0;
  const report = await prisma.googleAdsReport.create({
    data: {
      accountId, title,
      periodStart: periodStart ? new Date(periodStart) : null,
      periodEnd: periodEnd ? new Date(periodEnd) : null,
      totalImpressions: imp,
      totalClicks: clicks,
      totalCost: cost,
      totalConversions: conversions,
      totalConversionValue: agg._sum.conversionValue || null,
      averageCpc: clicks > 0 ? cost / clicks : null,
      averageCpa: conversions > 0 ? cost / conversions : null,
      averageRoas: cost > 0 && agg._sum.conversionValue ? agg._sum.conversionValue / cost : null,
      summary: summary || null,
    },
  });
  return successResponse(res, 201, "Report created", report);
});

export const deleteReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.googleAdsReport.delete({ where: { id } });
  return successResponse(res, 200, "Report deleted");
});

export const getProjectsWithoutAds = asyncHandler(async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { googleAdsAccounts: { none: {} } },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });
  return successResponse(res, 200, "Projects without Google Ads accounts", projects);
});
