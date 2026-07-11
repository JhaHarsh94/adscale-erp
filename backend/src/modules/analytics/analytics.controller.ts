import prisma from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { successResponse } from "../../utils/response";

/* ─── Dashboard ─── */
const dashboardInclude = {
  widgets: { orderBy: { position: "asc" as const } },
};

export const getAnalyticsDashboard = asyncHandler(async (req, res) => {
  const [totalDashboards, totalReports, totalKpis, dashboards] = await Promise.all([
    prisma.analyticsDashboard.count(),
    prisma.analyticsReport.count(),
    prisma.kpiDefinition.count({ where: { isActive: true } }),
    prisma.analyticsDashboard.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { widgets: true } } },
    }),
  ]);
  return successResponse(res, 200, "Analytics overview", {
    totalDashboards,
    totalReports,
    totalKpis,
    dashboards,
  });
});

export const listDashboards = asyncHandler(async (req, res) => {
  const dashboards = await prisma.analyticsDashboard.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { widgets: true } },
      creator: { select: { id: true, name: true } },
    },
  });
  return successResponse(res, 200, "Dashboards", dashboards);
});

export const getDashboard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dashboard = await prisma.analyticsDashboard.findUnique({
    where: { id },
    include: dashboardInclude,
  });
  if (!dashboard) throw new AppError("Dashboard not found", 404);
  return successResponse(res, 200, "Dashboard", dashboard);
});

export const createDashboard = asyncHandler(async (req, res) => {
  const { name, description, layout, isDefault } = req.body;
  if (!name) throw new AppError("Name is required", 400);
  const dashboard = await prisma.analyticsDashboard.create({
    data: {
      name,
      description: description || null,
      layout: layout || null,
      isDefault: isDefault || false,
      createdBy: (req as any).user?.id,
    },
    include: dashboardInclude,
  });
  return successResponse(res, 201, "Dashboard created", dashboard);
});

export const updateDashboard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, layout, isDefault } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (layout !== undefined) data.layout = layout;
  if (isDefault !== undefined) data.isDefault = isDefault;
  const dashboard = await prisma.analyticsDashboard.update({
    where: { id },
    data,
    include: dashboardInclude,
  });
  return successResponse(res, 200, "Dashboard updated", dashboard);
});

export const deleteDashboard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.analyticsDashboard.delete({ where: { id } });
  return successResponse(res, 200, "Dashboard deleted");
});

/* ─── Widgets ─── */
export const listWidgets = asyncHandler(async (req, res) => {
  const { dashboardId } = req.query;
  const where: Record<string, unknown> = {};
  if (dashboardId) where.dashboardId = String(dashboardId);
  const widgets = await prisma.analyticsWidget.findMany({
    where,
    orderBy: { position: "asc" },
    include: { dashboard: { select: { id: true, name: true } } },
  });
  return successResponse(res, 200, "Widgets", widgets);
});

export const createWidget = asyncHandler(async (req, res) => {
  const { dashboardId, title, type, dataSource, metric, queryConfig, position, width, height, color } = req.body;
  if (!dashboardId || !title) throw new AppError("dashboardId and title are required", 400);
  const dashboard = await prisma.analyticsDashboard.findUnique({ where: { id: dashboardId } });
  if (!dashboard) throw new AppError("Dashboard not found", 404);
  const widget = await prisma.analyticsWidget.create({
    data: {
      dashboardId,
      title,
      type: type || "metric",
      dataSource: dataSource || "manual",
      metric: metric || null,
      queryConfig: queryConfig || null,
      position: position !== undefined ? Number(position) : 0,
      width: width !== undefined ? Number(width) : 1,
      height: height !== undefined ? Number(height) : 1,
      color: color || "#10b981",
    },
  });
  return successResponse(res, 201, "Widget created", widget);
});

export const updateWidget = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, type, dataSource, metric, queryConfig, position, width, height, color, isActive } = req.body;
  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (type !== undefined) data.type = type;
  if (dataSource !== undefined) data.dataSource = dataSource;
  if (metric !== undefined) data.metric = metric;
  if (queryConfig !== undefined) data.queryConfig = queryConfig;
  if (position !== undefined) data.position = Number(position);
  if (width !== undefined) data.width = Number(width);
  if (height !== undefined) data.height = Number(height);
  if (color !== undefined) data.color = color;
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  const widget = await prisma.analyticsWidget.update({ where: { id }, data });
  return successResponse(res, 200, "Widget updated", widget);
});

export const deleteWidget = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.analyticsWidget.delete({ where: { id } });
  return successResponse(res, 200, "Widget deleted");
});

/* ─── Reports ─── */
export const listReports = asyncHandler(async (req, res) => {
  const reports = await prisma.analyticsReport.findMany({
    orderBy: { generatedAt: "desc" },
    include: { generator: { select: { id: true, name: true } } },
  });
  return successResponse(res, 200, "Reports", reports);
});

export const getReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const report = await prisma.analyticsReport.findUnique({
    where: { id },
    include: { generator: { select: { id: true, name: true } } },
  });
  if (!report) throw new AppError("Report not found", 404);
  return successResponse(res, 200, "Report", report);
});

export const generateReport = asyncHandler(async (req, res) => {
  const { title, description, type, dataSource, filters, chartConfig } = req.body;
  if (!title || !dataSource) throw new AppError("title and dataSource are required", 400);

  let snapshot: any = {};
  const now = new Date();
  const from = filters?.from ? new Date(filters.from) : new Date(now.getTime() - 30 * 86400000);
  const to = filters?.to ? new Date(filters.to) : now;

  switch (dataSource) {
    case "projects":
      snapshot = {
        total: await prisma.project.count({ where: { createdAt: { gte: from, lte: to } } }),
        byStatus: await prisma.project.groupBy({ by: ["status"], _count: true, where: { createdAt: { gte: from, lte: to } } }),
      };
      break;
    case "tasks":
      snapshot = {
        total: await prisma.task.count({ where: { createdAt: { gte: from, lte: to } } }),
        byStatus: await prisma.task.groupBy({ by: ["status"], _count: true, where: { createdAt: { gte: from, lte: to } } }),
      };
      break;
    case "finance":
      snapshot = {
        totalProposals: await prisma.commercialDocument.count({ where: { type: "PROPOSAL", createdAt: { gte: from, lte: to } } }),
        totalQuotations: await prisma.commercialDocument.count({ where: { type: "QUOTATION", createdAt: { gte: from, lte: to } } }),
        totalContracts: await prisma.commercialDocument.count({ where: { type: "CONTRACT", createdAt: { gte: from, lte: to } } }),
        byStatus: await prisma.commercialDocument.groupBy({ by: ["status"], _count: true, where: { createdAt: { gte: from, lte: to } } }),
      };
      break;
    case "crm":
      snapshot = {
        totalLeads: await prisma.lead.count({ where: { createdAt: { gte: from, lte: to } } }),
        totalClients: await prisma.client.count({ where: { createdAt: { gte: from, lte: to } } }),
        leadsByStatus: await prisma.lead.groupBy({ by: ["status"], _count: true, where: { createdAt: { gte: from, lte: to } } }),
      };
      break;
    case "attendance":
      snapshot = {
        totalRecords: await prisma.attendance.count({ where: { attendanceDate: { gte: from, lte: to } } }),
        byStatus: await prisma.attendance.groupBy({ by: ["status"], _count: true, where: { attendanceDate: { gte: from, lte: to } } }),
      };
      break;
    default:
      snapshot = { message: "No data source handler", dataSource };
  }

  const report = await prisma.analyticsReport.create({
    data: {
      title,
      description: description || null,
      type: type || "custom",
      dataSource,
      filters: (filters as any) || null,
      chartConfig: (chartConfig as any) || null,
      snapshot,
      generatedBy: (req as any).user?.id,
    },
    include: { generator: { select: { id: true, name: true } } },
  });
  return successResponse(res, 201, "Report generated", report);
});

export const deleteReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.analyticsReport.delete({ where: { id } });
  return successResponse(res, 200, "Report deleted");
});

/* ─── KPIs ─── */
export const listKpis = asyncHandler(async (req, res) => {
  const kpis = await prisma.kpiDefinition.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { results: true } },
      creator: { select: { id: true, name: true } },
    },
  });
  return successResponse(res, 200, "KPI definitions", kpis);
});

export const getKpi = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const kpi = await prisma.kpiDefinition.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true } },
      results: { orderBy: { periodStart: "desc" }, take: 12 },
    },
  });
  if (!kpi) throw new AppError("KPI not found", 404);
  return successResponse(res, 200, "KPI", kpi);
});

export const createKpi = asyncHandler(async (req, res) => {
  const { name, description, category, unit, targetValue, targetType, projectId } = req.body;
  if (!name || targetValue === undefined) throw new AppError("name and targetValue are required", 400);
  const kpi = await prisma.kpiDefinition.create({
    data: {
      name,
      description: description || null,
      category: category || "general",
      unit: unit || null,
      targetValue: Number(targetValue),
      targetType: targetType || "monthly",
      projectId: projectId || null,
      createdBy: (req as any).user?.id,
    },
    include: { project: { select: { id: true, name: true } }, creator: { select: { id: true, name: true } } },
  });
  return successResponse(res, 201, "KPI created", kpi);
});

export const updateKpi = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, category, unit, targetValue, targetType, projectId, isActive } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (category !== undefined) data.category = category;
  if (unit !== undefined) data.unit = unit;
  if (targetValue !== undefined) data.targetValue = Number(targetValue);
  if (targetType !== undefined) data.targetType = targetType;
  if (projectId !== undefined) data.projectId = projectId;
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  const kpi = await prisma.kpiDefinition.update({ where: { id }, data });
  return successResponse(res, 200, "KPI updated", kpi);
});

export const deleteKpi = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.kpiDefinition.delete({ where: { id } });
  return successResponse(res, 200, "KPI deleted");
});

/* ─── KPI Results ─── */
export const recordKpiResult = asyncHandler(async (req, res) => {
  const { kpiDefinitionId, actualValue, periodStart, periodEnd, notes } = req.body;
  if (!kpiDefinitionId || actualValue === undefined || !periodStart || !periodEnd) {
    throw new AppError("kpiDefinitionId, actualValue, periodStart, and periodEnd are required", 400);
  }
  const kpi = await prisma.kpiDefinition.findUnique({ where: { id: kpiDefinitionId } });
  if (!kpi) throw new AppError("KPI definition not found", 404);
  const result = await prisma.kpiResult.create({
    data: {
      kpiDefinitionId,
      actualValue: Number(actualValue),
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      notes: notes || null,
      recordedBy: (req as any).user?.id,
    },
    include: { kpiDefinition: { select: { id: true, name: true, targetValue: true } } },
  });
  return successResponse(res, 201, "KPI result recorded", result);
});

export const listKpiResults = asyncHandler(async (req, res) => {
  const { kpiDefinitionId } = req.query;
  const where: Record<string, unknown> = {};
  if (kpiDefinitionId) where.kpiDefinitionId = String(kpiDefinitionId);
  const results = await prisma.kpiResult.findMany({
    where,
    orderBy: { periodStart: "desc" },
    include: { kpiDefinition: { select: { id: true, name: true, targetValue: true, unit: true } } },
  });
  return successResponse(res, 200, "KPI results", results);
});

export const deleteKpiResult = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.kpiResult.delete({ where: { id } });
  return successResponse(res, 200, "KPI result deleted");
});

/* ─── Projects without dashboards ─── */
export const getProjectsWithoutAnalytics = asyncHandler(async (req, res) => {
  const projects = await prisma.project.findMany({
    where: {},
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return successResponse(res, 200, "Projects", projects);
});
