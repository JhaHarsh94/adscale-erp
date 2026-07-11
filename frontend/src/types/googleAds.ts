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
  project: { id: string; name: string; client: { id: string; name: string } };
  accountName: string;
  accountId: string | null;
  currency: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  _count?: { campaigns: number; keywords: number };
}

export interface GoogleAdsCampaign {
  id: string;
  accountId: string;
  account?: { id: string; accountName: string; project?: { id: string; name: string; client: { id: string; name: string } } };
  campaignName: string;
  campaignId: string | null;
  status: string;
  campaignType: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  startDate: string | null;
  endDate: string | null;
  targetCpa: number | null;
  targetRoas: number | null;
  createdAt: string;
  _count?: { keywords: number; metrics: number };
  metrics?: GoogleAdsMetric[];
}

export interface GoogleAdsKeyword {
  id: string;
  campaignId: string;
  campaign?: { id: string; campaignName: string };
  accountId: string;
  account?: { id: string; accountName: string };
  keyword: string;
  matchType: string;
  bidAmount: number | null;
  qualityScore: number | null;
  status: string;
  createdAt: string;
}

export interface GoogleAdsMetric {
  id: string;
  campaignId: string;
  keywordId: string | null;
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionValue: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cpa: number | null;
  roas: number | null;
  averagePosition: number | null;
  createdAt: string;
}

export interface GoogleAdsReport {
  id: string;
  accountId: string;
  account?: { id: string; accountName: string };
  title: string;
  periodStart: string | null;
  periodEnd: string | null;
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  totalConversionValue: number | null;
  averageCpc: number | null;
  averageCpa: number | null;
  averageRoas: number | null;
  summary: string | null;
  createdAt: string;
}
