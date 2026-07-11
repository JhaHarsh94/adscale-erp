import { useEffect, useState } from "react";
import {
  BarChart3,
  FileText,
  GitCompare,
  LayoutDashboard,
  Plus,
  RefreshCcw,
  Target,
  Trash2,
} from "lucide-react";
import { apiClient } from "../api/client";
import type { AnalyticsDashboard, AnalyticsOverview, AnalyticsReport, AnalyticsWidget, KpiDefinition, KpiResult } from "../types/analytics";

type Tab = "overview" | "dashboards" | "reports" | "kpis";

const tabs: { key: Tab; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "dashboards", label: "Dashboards", icon: LayoutDashboard },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "kpis", label: "KPIs", icon: Target },
];

const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500 focus:bg-white";
const select = input + " appearance-none";
const kpiUnit = (u: string | null) => u === "currency" ? "Rs." : u === "percentage" ? "%" : u || "";
const kpiColor = (actual: number, target: number) => actual >= target ? "text-emerald-600" : actual >= target * 0.8 ? "text-amber-600" : "text-red-600";

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  /* Overview */
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);

  /* Dashboards */
  const [dashboards, setDashboards] = useState<AnalyticsDashboard[]>([]);
  const [dashboardForm, setDashboardForm] = useState({ name: "", description: "" });

  /* Reports */
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [reportForm, setReportForm] = useState({ title: "", dataSource: "projects", description: "", filters: "{}" });
  const [reportSnapshot, setReportSnapshot] = useState<Record<string, unknown> | null>(null);

  /* KPIs */
  const [kpis, setKpis] = useState<KpiDefinition[]>([]);
  const [kpiForm, setKpiForm] = useState({ name: "", description: "", category: "general", unit: "", targetValue: "", targetType: "monthly", projectId: "" });
  const [kpiResultForm, setKpiResultForm] = useState({ kpiDefinitionId: "", actualValue: "", periodStart: "", periodEnd: "", notes: "" });
  const [kpiResults, setKpiResults] = useState<KpiResult[]>([]);
  const [selectedKpiForResults, setSelectedKpiForResults] = useState("");

  const msg = (s: string) => { setMessage(s); setTimeout(() => setMessage(""), 3000); };

  /* ─── Overview ─── */
  async function loadOverview() {
    setBusy(true);
    try { const r = await apiClient.get("/analytics/dashboard"); setOverview(r.data.data); }
    catch { msg("Could not load analytics overview"); }
    finally { setBusy(false); }
  }

  /* ─── Dashboards ─── */
  async function loadDashboards() {
    setBusy(true);
    try { const r = await apiClient.get("/analytics/dashboards"); setDashboards(r.data.data || []); }
    catch { msg("Could not load dashboards"); }
    finally { setBusy(false); }
  }

  async function createDashboard() {
    if (!dashboardForm.name) return msg("Name is required");
    setBusy(true);
    try {
      await apiClient.post("/analytics/dashboards", dashboardForm);
      msg("Dashboard created");
      setDashboardForm({ name: "", description: "" });
      await loadDashboards();
    } catch { msg("Could not create dashboard"); }
    finally { setBusy(false); }
  }

  async function deleteDashboard(id: string) {
    await apiClient.delete(`/analytics/dashboards/${id}`);
    await loadDashboards();
  }

  /* ─── Reports ─── */
  async function loadReports() {
    setBusy(true);
    try { const r = await apiClient.get("/analytics/reports"); setReports(r.data.data || []); }
    catch { msg("Could not load reports"); }
    finally { setBusy(false); }
  }

  async function generateReport() {
    if (!reportForm.title || !reportForm.dataSource) return msg("Title and data source required");
    setBusy(true);
    try {
      const filters = JSON.parse(reportForm.filters || "{}");
      const r = await apiClient.post("/analytics/reports/generate", { ...reportForm, filters });
      msg("Report generated");
      setReportSnapshot(r.data.data.snapshot);
      setReportForm({ title: "", dataSource: "projects", description: "", filters: "{}" });
      await loadReports();
    } catch { msg("Could not generate report"); }
    finally { setBusy(false); }
  }

  async function deleteReport(id: string) {
    await apiClient.delete(`/analytics/reports/${id}`);
    await loadReports();
  }

  /* ─── KPIs ─── */
  async function loadKpis() {
    setBusy(true);
    try { const r = await apiClient.get("/analytics/kpis"); setKpis(r.data.data || []); }
    catch { msg("Could not load KPIs"); }
    finally { setBusy(false); }
  }

  async function createKpi() {
    if (!kpiForm.name || !kpiForm.targetValue) return msg("Name and target value are required");
    setBusy(true);
    try {
      await apiClient.post("/analytics/kpis", { ...kpiForm, targetValue: Number(kpiForm.targetValue), projectId: kpiForm.projectId || null });
      msg("KPI created");
      setKpiForm({ name: "", description: "", category: "general", unit: "", targetValue: "", targetType: "monthly", projectId: "" });
      await loadKpis();
    } catch { msg("Could not create KPI"); }
    finally { setBusy(false); }
  }

  async function deleteKpi(id: string) {
    await apiClient.delete(`/analytics/kpis/${id}`);
    await loadKpis();
  }

  async function loadKpiResults(kpiId: string) {
    setSelectedKpiForResults(kpiId);
    try { const r = await apiClient.get(`/analytics/kpi-results?kpiDefinitionId=${kpiId}`); setKpiResults(r.data.data || []); }
    catch { msg("Could not load KPI results"); }
  }

  async function recordKpiResult() {
    if (!kpiResultForm.kpiDefinitionId || !kpiResultForm.actualValue || !kpiResultForm.periodStart || !kpiResultForm.periodEnd) return msg("All fields required");
    setBusy(true);
    try {
      await apiClient.post("/analytics/kpi-results", { ...kpiResultForm, actualValue: Number(kpiResultForm.actualValue) });
      msg("Result recorded");
      setKpiResultForm({ kpiDefinitionId: "", actualValue: "", periodStart: "", periodEnd: "", notes: "" });
      await loadKpiResults(selectedKpiForResults);
    } catch { msg("Could not record result"); }
    finally { setBusy(false); }
  }

  async function deleteKpiResult(id: string) {
    await apiClient.delete(`/analytics/kpi-results/${id}`);
    await loadKpiResults(selectedKpiForResults);
  }

  useEffect(() => {
    if (tab === "overview") { void loadOverview(); }
    else if (tab === "dashboards") { void loadDashboards(); }
    else if (tab === "reports") { void loadReports(); }
    else if (tab === "kpis") { void loadKpis(); }
  }, [tab]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-violet-700 via-indigo-800 to-slate-950 p-8 text-white">
        <p className="text-xs font-black uppercase tracking-[.28em] text-violet-200">Phase 27</p>
        <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-4xl font-black">Analytics Center</h1>
            <p className="mt-2 text-sm text-violet-100">Dashboards, reports, and KPI tracking across the organization.</p>
          </div>
          <button onClick={() => { if (tab === "overview") loadOverview(); else if (tab === "dashboards") loadDashboards(); else if (tab === "reports") loadReports(); else loadKpis(); }} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-black"><RefreshCcw size={17} /> Refresh</button>
        </div>
      </section>

      {message && <div className="break-all rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm font-bold text-violet-800">{message}</div>}

      <div className="flex gap-2 rounded-2xl border bg-white p-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center justify-center gap-2 flex-1 rounded-xl px-4 py-3 text-sm font-black ${tab === t.key ? "bg-violet-700 text-white" : "text-slate-500"}`}>
            <t.icon size={17} /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ─── */}
      {tab === "overview" && (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            {[
              ["Total Dashboards", overview?.totalDashboards ?? 0, "bg-violet-50 text-violet-700"],
              ["Generated Reports", overview?.totalReports ?? 0, "bg-indigo-50 text-indigo-700"],
              ["Active KPIs", overview?.totalKpis ?? 0, "bg-emerald-50 text-emerald-700"],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="rounded-2xl border bg-white p-6">
                <p className="text-xs font-black uppercase text-slate-400">{String(label)}</p>
                <p className={`mt-2 text-4xl font-black ${String(color)}`}>{String(value)}</p>
              </div>
            ))}
          </section>
          <section className="rounded-2xl border bg-white p-6">
            <h2 className="text-xl font-black">Recent Dashboards</h2>
            {overview?.dashboards && overview.dashboards.length > 0 ? (
              <div className="mt-4 space-y-2">
                {overview.dashboards.map(d => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                    <div>
                      <p className="font-black text-slate-900">{d.name}</p>
                      {d.description && <p className="text-sm font-semibold text-slate-500">{d.description}</p>}
                    </div>
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">{d._count?.widgets || 0} widgets</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 font-bold text-slate-400">No dashboards yet. Create one to get started.</p>
            )}
          </section>
        </div>
      )}

      {/* ─── Dashboards Tab ─── */}
      {tab === "dashboards" && (
        <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-2xl border bg-white p-6">
            <div className="flex items-center gap-2">
              <Plus className="text-violet-700" />
              <h2 className="text-xl font-black">New Dashboard</h2>
            </div>
            <div className="mt-5 space-y-3">
              <input className={input} value={dashboardForm.name} onChange={e => setDashboardForm({ ...dashboardForm, name: e.target.value })} placeholder="Dashboard name" />
              <textarea className={input} value={dashboardForm.description} onChange={e => setDashboardForm({ ...dashboardForm, description: e.target.value })} placeholder="Description (optional)" rows={3} />
              <button disabled={busy} onClick={createDashboard} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-black text-white">Create Dashboard</button>
            </div>
          </div>
          <div className="space-y-3">
            {dashboards.length === 0 && <div className="rounded-2xl border bg-white p-8 text-center font-bold text-slate-400">No dashboards yet.</div>}
            {dashboards.map(d => (
              <article key={d.id} className="rounded-2xl border bg-white p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <div className="flex items-center gap-2">
                      {d.isDefault && <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">Default</span>}
                      <span className="text-xs font-bold text-slate-400">{d._count?.widgets || 0} widgets</span>
                    </div>
                    <h3 className="mt-3 text-lg font-black">{d.name}</h3>
                    {d.description && <p className="mt-1 text-sm font-semibold text-slate-500">{d.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => deleteDashboard(d.id)} className="rounded-xl border p-2.5 text-red-600"><Trash2 size={17} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ─── Reports Tab ─── */}
      {tab === "reports" && (
        <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-2xl border bg-white p-6">
            <div className="flex items-center gap-2">
              <GitCompare className="text-indigo-700" />
              <h2 className="text-xl font-black">Generate Report</h2>
            </div>
            <div className="mt-5 space-y-3">
              <input className={input} value={reportForm.title} onChange={e => setReportForm({ ...reportForm, title: e.target.value })} placeholder="Report title" />
              <select className={select} value={reportForm.dataSource} onChange={e => setReportForm({ ...reportForm, dataSource: e.target.value })}>
                <option value="projects">Projects</option>
                <option value="tasks">Tasks</option>
                <option value="finance">Finance / Commercial</option>
                <option value="crm">CRM</option>
                <option value="attendance">Attendance</option>
              </select>
              <textarea className={input} value={reportForm.description} onChange={e => setReportForm({ ...reportForm, description: e.target.value })} placeholder="Description (optional)" rows={2} />
              <input className={input} value={reportForm.filters} onChange={e => setReportForm({ ...reportForm, filters: e.target.value })} placeholder='Filters JSON (e.g. {"from":"2026-01-01","to":"2026-12-31"})' />
              <button disabled={busy} onClick={generateReport} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-black text-white">Generate Report</button>
            </div>
            {reportSnapshot && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-400">Snapshot Preview</p>
                <pre className="mt-2 overflow-auto text-xs font-semibold text-slate-700">{JSON.stringify(reportSnapshot, null, 2)}</pre>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {reports.length === 0 && <div className="rounded-2xl border bg-white p-8 text-center font-bold text-slate-400">No reports yet.</div>}
            {reports.map(r => (
              <article key={r.id} className="rounded-2xl border bg-white p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">{r.dataSource}</span>
                      <span className="text-xs font-bold text-slate-400">{new Date(r.generatedAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-black">{r.title}</h3>
                    {r.description && <p className="mt-1 text-sm font-semibold text-slate-500">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => deleteReport(r.id)} className="rounded-xl border p-2.5 text-red-600"><Trash2 size={17} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ─── KPIs Tab ─── */}
      {tab === "kpis" && (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-6">
            <div className="flex items-center gap-2">
              <Plus className="text-emerald-700" />
              <h2 className="text-xl font-black">New KPI</h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <input className={input} value={kpiForm.name} onChange={e => setKpiForm({ ...kpiForm, name: e.target.value })} placeholder="KPI name" />
              <select className={select} value={kpiForm.category} onChange={e => setKpiForm({ ...kpiForm, category: e.target.value })}>
                <option value="general">General</option>
                <option value="financial">Financial</option>
                <option value="project">Project</option>
                <option value="sales">Sales</option>
                <option value="hr">HR</option>
                <option value="marketing">Marketing</option>
              </select>
              <select className={select} value={kpiForm.unit} onChange={e => setKpiForm({ ...kpiForm, unit: e.target.value })}>
                <option value="">No unit</option>
                <option value="count">Count</option>
                <option value="percentage">Percentage</option>
                <option value="currency">Currency</option>
                <option value="hours">Hours</option>
              </select>
              <input className={input} type="number" value={kpiForm.targetValue} onChange={e => setKpiForm({ ...kpiForm, targetValue: e.target.value })} placeholder="Target value" />
              <select className={select} value={kpiForm.targetType} onChange={e => setKpiForm({ ...kpiForm, targetType: e.target.value })}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              <textarea className={input} value={kpiForm.description} onChange={e => setKpiForm({ ...kpiForm, description: e.target.value })} placeholder="Description (optional)" rows={1} />
            </div>
            <button disabled={busy} onClick={createKpi} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">Create KPI</button>
          </section>

          <section className="space-y-3">
            {kpis.length === 0 && <div className="rounded-2xl border bg-white p-8 text-center font-bold text-slate-400">No KPIs defined yet.</div>}
            {kpis.map(k => (
              <article key={k.id} className="rounded-2xl border bg-white p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{k.category}</span>
                      <span className="text-xs font-bold text-slate-400">{k.targetType} target: {k.targetValue}{kpiUnit(k.unit)}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-black">{k.name}</h3>
                    {k.description && <p className="mt-1 text-sm font-semibold text-slate-500">{k.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {k._count && k._count.results > 0 && (
                      <button onClick={() => loadKpiResults(k.id)} className="rounded-xl border px-3 py-2 text-xs font-black">
                        {k._count.results} results
                      </button>
                    )}
                    <button onClick={() => { setKpiResultForm({ ...kpiResultForm, kpiDefinitionId: k.id }); if (selectedKpiForResults !== k.id) loadKpiResults(k.id); }} className="rounded-xl border px-3 py-2 text-xs font-black text-emerald-700">+ Result</button>
                    <button onClick={() => deleteKpi(k.id)} className="rounded-xl border p-2.5 text-red-600"><Trash2 size={17} /></button>
                  </div>
                </div>
                {selectedKpiForResults === k.id && (
                  <div className="mt-4 border-t pt-4">
                    <div className="grid gap-3 md:grid-cols-5">
                      <input className={input} type="number" value={kpiResultForm.kpiDefinitionId === k.id ? kpiResultForm.actualValue : ""} onChange={e => setKpiResultForm({ ...kpiResultForm, kpiDefinitionId: k.id, actualValue: e.target.value })} placeholder="Actual value" />
                      <input className={input} type="date" value={kpiResultForm.periodStart} onChange={e => setKpiResultForm({ ...kpiResultForm, periodStart: e.target.value })} />
                      <input className={input} type="date" value={kpiResultForm.periodEnd} onChange={e => setKpiResultForm({ ...kpiResultForm, periodEnd: e.target.value })} />
                      <input className={input} value={kpiResultForm.notes} onChange={e => setKpiResultForm({ ...kpiResultForm, notes: e.target.value })} placeholder="Notes" />
                      <button disabled={busy} onClick={recordKpiResult} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white">Record</button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {kpiResults.map(r => (
                        <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-lg font-black ${kpiColor(r.actualValue, r.kpiDefinition?.targetValue || 0)}`}>{r.actualValue}{kpiUnit(r.kpiDefinition?.unit || null)}</span>
                            <span className="text-sm font-semibold text-slate-500">{new Date(r.periodStart).toLocaleDateString()} - {new Date(r.periodEnd).toLocaleDateString()}</span>
                            {r.notes && <span className="text-xs font-semibold text-slate-400">{r.notes}</span>}
                          </div>
                          <button onClick={() => deleteKpiResult(r.id)} className="text-red-600"><Trash2 size={15} /></button>
                        </div>
                      ))}
                      {kpiResults.length === 0 && <p className="text-sm font-semibold text-slate-400">No results recorded yet.</p>}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
