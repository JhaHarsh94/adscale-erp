import { useEffect, useState } from "react";
import { Search, TrendingUp, Globe, BarChart3, Plus, Trash2, Save, RefreshCcw, XCircle, DollarSign, MousePointerClick, Eye, Target, Wallet } from "lucide-react";
import { apiClient } from "../api/client";
import type { GoogleAdsDashboard, GoogleAdsAccount, GoogleAdsCampaign, GoogleAdsReport } from "../types/googleAds";

const f = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";

const tabs = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "accounts", label: "Accounts", icon: Globe },
  { key: "campaigns", label: "Campaigns", icon: TrendingUp },
  { key: "reports", label: "Reports", icon: Wallet },
];

function inr(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default function GoogleAdsPage() {
  const [tab, setTab] = useState("dashboard");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<GoogleAdsDashboard | null>(null);
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [availProjects, setAvailProjects] = useState<{ id: string; name: string }[]>([]);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState({ projectId: "", accountName: "", accountId: "", currency: "INR", timezone: "Asia/Kolkata" });
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ accountId: "", campaignName: "", campaignId: "", status: "ACTIVE", dailyBudget: "", startDate: "", endDate: "" });
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [metricForm, setMetricForm] = useState({ campaignId: "", date: "", impressions: "", clicks: "", cost: "", conversions: "", conversionValue: "" });
  const [reports, setReports] = useState<GoogleAdsReport[]>([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState({ accountId: "", title: "", periodStart: "", periodEnd: "", summary: "" });
  const [search, setSearch] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  function msgOk(s: string) { setMsg(s); setTimeout(() => setMsg(""), 3000); }

  async function loadDashboard() {
    setLoading(true);
    try { const res = await apiClient.get("/google-ads/dashboard"); setDashboard(res.data.data); } catch { setMsg("Failed to load dashboard"); }
    setLoading(false);
  }
  async function loadAccounts() { try { const res = await apiClient.get("/google-ads/accounts"); setAccounts(res.data.data || []); } catch {} }
  async function loadAvailProjects() { try { const res = await apiClient.get("/google-ads/accounts/without-ads"); setAvailProjects(res.data.data || []); } catch {} }
  async function loadCampaigns() {
    try {
      const params: Record<string, string> = {};
      if (filterAccount) params.accountId = filterAccount;
      if (filterStatus) params.status = filterStatus;
      const res = await apiClient.get("/google-ads/campaigns", { params });
      setCampaigns(res.data.data || []);
    } catch {}
  }
  async function loadReports() { try { const res = await apiClient.get("/google-ads/reports"); setReports(res.data.data || []); } catch {} }

  useEffect(() => { if (tab === "dashboard") loadDashboard(); }, [tab]);
  useEffect(() => { if (tab === "accounts") { loadAccounts(); loadAvailProjects(); } }, [tab]);
  useEffect(() => { if (tab === "campaigns") { loadCampaigns(); loadAccounts(); } }, [tab, filterAccount, filterStatus]);
  useEffect(() => { if (tab === "reports") { loadReports(); loadAccounts(); } }, [tab]);

  async function createAccount() {
    if (!accountForm.projectId || !accountForm.accountName) { setMsg("Project and account name required"); return; }
    try {
      await apiClient.post("/google-ads/accounts", accountForm);
      msgOk("Account created"); setShowAccountForm(false);
      setAccountForm({ projectId: "", accountName: "", accountId: "", currency: "INR", timezone: "Asia/Kolkata" });
      loadAccounts(); loadAvailProjects();
    } catch { setMsg("Failed"); }
  }
  async function deleteAccount(id: string) { try { await apiClient.delete(`/google-ads/accounts/${id}`); msgOk("Deleted"); loadAccounts(); } catch { setMsg("Failed"); } }

  async function createCampaign() {
    if (!campaignForm.accountId || !campaignForm.campaignName) { setMsg("Account and campaign name required"); return; }
    try {
      await apiClient.post("/google-ads/campaigns", campaignForm);
      msgOk("Campaign created"); setShowCampaignForm(false);
      setCampaignForm({ accountId: "", campaignName: "", campaignId: "", status: "ACTIVE", dailyBudget: "", startDate: "", endDate: "" });
      loadCampaigns();
    } catch { setMsg("Failed"); }
  }
  async function deleteCampaign(id: string) { try { await apiClient.delete(`/google-ads/campaigns/${id}`); msgOk("Deleted"); loadCampaigns(); } catch { setMsg("Failed"); } }

  async function upsertMetric() {
    if (!metricForm.campaignId || !metricForm.date) { setMsg("Campaign and date required"); return; }
    try {
      await apiClient.post("/google-ads/metrics", metricForm);
      msgOk("Metric saved"); setShowMetricForm(false);
      setMetricForm({ campaignId: "", date: "", impressions: "", clicks: "", cost: "", conversions: "", conversionValue: "" });
    } catch { setMsg("Failed"); }
  }

  async function createReport() {
    if (!reportForm.accountId || !reportForm.title) { setMsg("Account and title required"); return; }
    try {
      await apiClient.post("/google-ads/reports", reportForm);
      msgOk("Report created"); setShowReportForm(false);
      setReportForm({ accountId: "", title: "", periodStart: "", periodEnd: "", summary: "" });
      loadReports();
    } catch { setMsg("Failed"); }
  }
  async function deleteReport(id: string) { try { await apiClient.delete(`/google-ads/reports/${id}`); msgOk("Deleted"); loadReports(); } catch { setMsg("Failed"); } }

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-6 md:p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.28em] text-blue-200">Phase 24</p>
            <h1 className="mt-3 text-2xl md:text-4xl font-black">Google Ads Management</h1>
            <p className="mt-2 text-xs md:text-sm text-blue-100">Campaign tracking, budget management & performance metrics.</p>
          </div>
          <button onClick={() => { if (tab === "dashboard") loadDashboard(); }} className="rounded-xl bg-white/10 p-2.5 md:p-3"><RefreshCcw size={18} /></button>
        </div>
      </section>

      {msg && (
        <div className="rounded-xl bg-blue-50 p-3 md:p-4 text-xs md:text-sm font-bold text-blue-800 flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="text-blue-400 hover:text-blue-700"><XCircle size={16} /></button>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-b-2 transition whitespace-nowrap ${tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-400 hover:text-slate-700"}`}>
              <Icon size={14} />{t.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && loading && (
        <div className="flex justify-center py-16"><div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" /></div>
      )}
      {tab === "dashboard" && !loading && dashboard && (
        <div className="space-y-6">
          <div className="grid gap-3 md:gap-4 grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Accounts", value: dashboard.totalAccounts, icon: Globe },
              { label: "Campaigns", value: dashboard.totalCampaigns, icon: TrendingUp },
              { label: "Impressions", value: dashboard.totalImpressions.toLocaleString("en-IN"), icon: Eye },
              { label: "Clicks", value: dashboard.totalClicks.toLocaleString("en-IN"), icon: MousePointerClick },
              { label: "Cost", value: inr(dashboard.totalCost), icon: DollarSign },
              { label: "Conversions", value: dashboard.totalConversions.toLocaleString("en-IN"), icon: Target },
              { label: "Conv. Value", value: inr(dashboard.totalConversionValue), icon: Wallet },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="rounded-2xl border bg-white p-3 md:p-4">
                  <Icon className="text-blue-700" size={18} />
                  <p className="mt-2 md:mt-3 text-[10px] md:text-xs font-black uppercase text-slate-400">{c.label}</p>
                  <p className="mt-0.5 md:mt-1 text-xl md:text-2xl font-black text-slate-900">{c.value}</p>
                </div>
              );
            })}
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="font-black text-slate-900 mb-3">Recent Campaigns</h3>
            {dashboard.recentCampaigns.length === 0 ? (
              <p className="text-sm text-slate-400">No campaigns yet</p>
            ) : (
              <div className="space-y-2">
                {dashboard.recentCampaigns.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{c.campaignName}</p>
                      <p className="text-xs text-slate-500">{c.account?.accountName} — {c.account?.project?.client?.name}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${c.status === "ACTIVE" ? "bg-green-50 text-green-700" : c.status === "PAUSED" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{c.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "accounts" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500">{accounts.length} Google Ads account(s)</p>
            <button onClick={() => { setShowAccountForm(!showAccountForm); if (!showAccountForm) loadAvailProjects(); }} className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white"><Plus size={16} />New Account</button>
          </div>
          {showAccountForm && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <h3 className="font-black text-blue-800">Link Google Ads Account</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <select className={f} value={accountForm.projectId} onChange={(e) => setAccountForm({ ...accountForm, projectId: e.target.value })}>
                  <option value="">Select project *</option>
                  {availProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input className={f} placeholder="Account name *" value={accountForm.accountName} onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })} />
                <input className={f} placeholder="Google Ads Customer ID" value={accountForm.accountId} onChange={(e) => setAccountForm({ ...accountForm, accountId: e.target.value })} />
                <select className={f} value={accountForm.currency} onChange={(e) => setAccountForm({ ...accountForm, currency: e.target.value })}>
                  {["INR", "USD", "EUR", "GBP"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input className={f} placeholder="Timezone" value={accountForm.timezone} onChange={(e) => setAccountForm({ ...accountForm, timezone: e.target.value })} />
              </div>
              <button onClick={createAccount} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white"><Save size={16} className="inline mr-1" />Create</button>
            </div>
          )}
          {accounts.map((a) => (
            <div key={a.id} className="rounded-2xl border bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700"><Globe size={18} /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">{a.accountName}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{a.currency}</span>
                      {a.accountId && <span className="text-[10px] font-bold text-slate-400">ID: {a.accountId}</span>}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{a.project.name} — {a.project.client.name}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-[10px] font-bold text-slate-400">
                      <span>{a._count?.campaigns || 0} campaigns</span>
                      <span>{a.timezone}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteAccount(a.id)} className="rounded-xl bg-red-50 p-2 text-red-500 hover:bg-red-100"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {accounts.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No Google Ads accounts linked</p>}
        </div>
      )}

      {tab === "campaigns" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 flex-1 max-w-xs">
              <Search size={14} className="text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns..." className="w-full bg-transparent text-xs font-semibold text-slate-900 outline-none" />
            </div>
            <select className={f + " max-w-[180px]"} value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
              <option value="">All accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
            </select>
            <select className={f + " max-w-[150px]"} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All status</option>
              {["ACTIVE", "PAUSED", "REMOVED", "ENDED"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => setShowCampaignForm(!showCampaignForm)} className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white"><Plus size={16} />New Campaign</button>
          </div>
          {showCampaignForm && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <h3 className="font-black text-blue-800">Create Campaign</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <select className={f} value={campaignForm.accountId} onChange={(e) => setCampaignForm({ ...campaignForm, accountId: e.target.value })}>
                  <option value="">Select account *</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                </select>
                <input className={f} placeholder="Campaign name *" value={campaignForm.campaignName} onChange={(e) => setCampaignForm({ ...campaignForm, campaignName: e.target.value })} />
                <input className={f} placeholder="Campaign ID" value={campaignForm.campaignId} onChange={(e) => setCampaignForm({ ...campaignForm, campaignId: e.target.value })} />
                <select className={f} value={campaignForm.status} onChange={(e) => setCampaignForm({ ...campaignForm, status: e.target.value })}>
                  {["ACTIVE", "PAUSED", "REMOVED", "ENDED"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input className={f} type="number" placeholder="Daily budget" value={campaignForm.dailyBudget} onChange={(e) => setCampaignForm({ ...campaignForm, dailyBudget: e.target.value })} />
                <input className={f} type="date" placeholder="Start date" value={campaignForm.startDate} onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })} />
                <input className={f} type="date" placeholder="End date" value={campaignForm.endDate} onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })} />
              </div>
              <button onClick={createCampaign} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white"><Save size={16} className="inline mr-1" />Create</button>
            </div>
          )}
          <div className="space-y-2">
            {campaigns.filter((c) => !search || c.campaignName.toLowerCase().includes(search.toLowerCase())).map((c) => {
              const aggMetrics = c.metrics?.length ? c.metrics.reduce((acc, m) => ({
                impressions: acc.impressions + m.impressions,
                clicks: acc.clicks + m.clicks,
                cost: acc.cost + m.cost,
                conversions: acc.conversions + m.conversions,
              }), { impressions: 0, clicks: 0, cost: 0, conversions: 0 }) : null;
              return (
                <div key={c.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{c.campaignName}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${c.status === "ACTIVE" ? "bg-green-50 text-green-700" : c.status === "PAUSED" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{c.status}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{c.account?.accountName} — {c.account?.project?.client?.name}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-semibold text-slate-400">
                        {c.dailyBudget && <span>Daily: {inr(c.dailyBudget)}</span>}
                        {c.startDate && <span>Start: {new Date(c.startDate).toLocaleDateString()}</span>}
                        {aggMetrics && (
                          <>
                            <span><Eye size={12} className="inline mr-1" />{aggMetrics.impressions.toLocaleString("en-IN")}</span>
                            <span><MousePointerClick size={12} className="inline mr-1" />{aggMetrics.clicks.toLocaleString("en-IN")}</span>
                            <span><DollarSign size={12} className="inline mr-1" />{inr(aggMetrics.cost)}</span>
                            <span><Target size={12} className="inline mr-1" />{aggMetrics.conversions}</span>
                            {aggMetrics.clicks > 0 && <span>CPC: {inr(aggMetrics.cost / aggMetrics.clicks)}</span>}
                          </>
                        )}
                        {c._count && <span>{c._count.metrics} metric entries</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => { setMetricForm({ ...metricForm, campaignId: c.id, date: new Date().toISOString().slice(0, 10) }); setShowMetricForm(true); }} className="rounded-lg bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100"><BarChart3 size={14} /></button>
                      <button onClick={() => deleteCampaign(c.id)} className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {campaigns.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No campaigns yet</p>}
          </div>
          {showMetricForm && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <h3 className="font-black text-blue-800">Log Daily Metric</h3>
              <div className="grid gap-3 md:grid-cols-4">
                <input className={f} type="date" value={metricForm.date} onChange={(e) => setMetricForm({ ...metricForm, date: e.target.value })} />
                <input className={f} type="number" placeholder="Impressions" value={metricForm.impressions} onChange={(e) => setMetricForm({ ...metricForm, impressions: e.target.value })} />
                <input className={f} type="number" placeholder="Clicks" value={metricForm.clicks} onChange={(e) => setMetricForm({ ...metricForm, clicks: e.target.value })} />
                <input className={f} type="number" placeholder="Cost" value={metricForm.cost} onChange={(e) => setMetricForm({ ...metricForm, cost: e.target.value })} />
                <input className={f} type="number" placeholder="Conversions" value={metricForm.conversions} onChange={(e) => setMetricForm({ ...metricForm, conversions: e.target.value })} />
                <input className={f} type="number" placeholder="Conv. value" value={metricForm.conversionValue} onChange={(e) => setMetricForm({ ...metricForm, conversionValue: e.target.value })} />
              </div>
              <button onClick={upsertMetric} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white"><Save size={16} className="inline mr-1" />Save</button>
            </div>
          )}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500">{reports.length} report(s)</p>
            <button onClick={() => setShowReportForm(!showReportForm)} className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white"><Plus size={16} />Generate Report</button>
          </div>
          {showReportForm && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <h3 className="font-black text-blue-800">Generate Report</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <select className={f} value={reportForm.accountId} onChange={(e) => setReportForm({ ...reportForm, accountId: e.target.value })}>
                  <option value="">Select account *</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                </select>
                <input className={f} placeholder="Report title *" value={reportForm.title} onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })} />
                <input className={f} type="date" placeholder="Period start" value={reportForm.periodStart} onChange={(e) => setReportForm({ ...reportForm, periodStart: e.target.value })} />
                <input className={f} type="date" placeholder="Period end" value={reportForm.periodEnd} onChange={(e) => setReportForm({ ...reportForm, periodEnd: e.target.value })} />
                <textarea className={`${f} md:col-span-3 min-h-[60px]`} placeholder="Summary (auto-calculated from metrics)" value={reportForm.summary} onChange={(e) => setReportForm({ ...reportForm, summary: e.target.value })} />
              </div>
              <button onClick={createReport} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white"><Save size={16} className="inline mr-1" />Generate</button>
            </div>
          )}
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Impressions</th>
                  <th className="px-4 py-3">Clicks</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Conversions</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs font-semibold text-slate-700">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">{r.title}</td>
                    <td className="px-4 py-3">{r.account?.accountName || "—"}</td>
                    <td className="px-4 py-3">{r.periodStart ? `${new Date(r.periodStart).toLocaleDateString()} - ${r.periodEnd ? new Date(r.periodEnd).toLocaleDateString() : "now"}` : "—"}</td>
                    <td className="px-4 py-3">{r.totalImpressions.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">{r.totalClicks.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">{inr(r.totalCost)}</td>
                    <td className="px-4 py-3">{r.totalConversions}</td>
                    <td className="px-4 py-3"><button onClick={() => deleteReport(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm font-bold text-slate-400">No reports generated</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
