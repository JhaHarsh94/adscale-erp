export interface AnalyticsOverview {
  totalDashboards: number;
  totalReports: number;
  totalKpis: number;
  dashboards: AnalyticsDashboard[];
}

export interface AnalyticsDashboard {
  id: string;
  name: string;
  description: string | null;
  layout: unknown;
  isDefault: boolean;
  createdBy: string | null;
  creator?: { id: string; name: string } | null;
  widgets?: AnalyticsWidget[];
  _count?: { widgets: number };
  createdAt: string;
}

export interface AnalyticsWidget {
  id: string;
  dashboardId: string;
  title: string;
  type: string;
  dataSource: string;
  metric: string | null;
  queryConfig: unknown;
  position: number;
  width: number;
  height: number;
  color: string | null;
  isActive: boolean;
  dashboard?: { id: string; name: string };
  createdAt: string;
}

export interface AnalyticsReport {
  id: string;
  title: string;
  description: string | null;
  type: string;
  dataSource: string;
  filters: unknown;
  chartConfig: unknown;
  snapshot: unknown;
  generatedBy: string | null;
  generator?: { id: string; name: string } | null;
  generatedAt: string;
  createdAt: string;
}

export interface KpiDefinition {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string | null;
  targetValue: number;
  targetType: string;
  projectId: string | null;
  project?: { id: string; name: string } | null;
  isActive: boolean;
  createdBy: string | null;
  creator?: { id: string; name: string } | null;
  _count?: { results: number };
  results?: KpiResult[];
  createdAt: string;
}

export interface KpiResult {
  id: string;
  kpiDefinitionId: string;
  kpiDefinition?: { id: string; name: string; targetValue: number; unit: string | null };
  actualValue: number;
  periodStart: string;
  periodEnd: string;
  notes: string | null;
  recordedBy: string | null;
  recorder?: { id: string; name: string } | null;
  createdAt: string;
}
