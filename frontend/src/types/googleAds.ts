export interface GoogleAdsDashboard {
  totalAccounts: number;
  totalCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  totalConversionValue: number;
  recentCampaigns: GoogleAdsCampaign[];
}

export interface GoogleAdsAccount {
  id: string;
  projectId: string;
  accountName: string;
  accountId: string | null;
  currency: string;
  timezone: string;
  isActive: boolean;
  project: { id: string; name: string; client: { id: string; name: string } };
  _count: { campaigns: number };
  campaigns?: GoogleAdsCampaign[];
  createdAt: string;
}

export interface GoogleAdsCampaign {
  id: string;
  accountId: string;
  campaignName: string;
  campaignId: string | null;
  status: string;
  dailyBudget: number | null;
  startDate: string | null;
  endDate: string | null;
  account?: { id: string; accountName: string; project?: { id: string; name: string; client: { id: string; name: string } } };
  _count?: { metrics: number };
  metrics?: GoogleAdsMetric[];
  createdAt: string;
}

export interface GoogleAdsMetric {
  id: string;
  campaignId: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number | null;
  ctr: number | null;
  cpc: number | null;
  cpa: number | null;
  roas: number | null;
}

export interface GoogleAdsReport {
  id: string;
  accountId: string;
  title: string;
  periodStart: string | null;
  periodEnd: string | null;
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  totalConversionValue: number | null;
  summary: string | null;
  account?: { id: string; accountName: string };
  createdAt: string;
}
