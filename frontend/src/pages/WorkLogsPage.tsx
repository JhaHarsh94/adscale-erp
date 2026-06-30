import { useEffect, useState } from "react";
import { Clock, Plus, RefreshCcw, CheckCircle2, XCircle, FileText } from "lucide-react";
import { apiClient } from "../api/client";
import type { Employee } from "../types/employee";
import type { Task } from "../types/task";
import type { DailyReportGroup, TodayWorkLogs, WorkLog, WorkLogDashboard } from "../types/worklog";

const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";
const userJson = localStorage.getItem("adscale_user");
const currentUser = userJson ? JSON.parse(userJson) : null;
const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(currentUser?.role?.name || "");

export default function WorkLogsPage() {
  const [dashboard, setDashboard] = useState<WorkLogDashboard | null>(null);
  const [todayData, setTodayData] = useState<TodayWorkLogs | null>(null);
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [report, setReport] = useState<DailyReportGroup[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"today" | "list" | "report">("today");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ description: "", durationMins: "30", taskId: "", billable: true, date: new Date().toISOString().split("T")[0] });
  const [filterDate, setFilterDate] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  async function load() {
    try {
      const [dash, tdy] = await Promise.all([
        apiClient.get("/worklogs/dashboard"),
        apiClient.get("/worklogs/today"),
      ]);
      setDashboard(dash.data.data);
      setTodayData(tdy.data.data);
    } catch { setMessage("Unable to load work logs"); }
  }

  async function loadTasks() {
    try { const res = await apiClient.get("/tasks"); setTasks(res.data.data || []); } catch {}
  }

  async function loadEmployees() {
    try { const res = await apiClient.get("/employees"); setEmployees(res.data.data || []); } catch {}
  }

  useEffect(() => { void load(); if (isAgent) { void loadEmployees(); } void loadTasks(); }, []);

  async function loadList() {
    try {
      const params: Record<string, string> = {};
      if (filterDate) params.date = filterDate;
      if (filterEmployee) params.employeeId = filterEmployee;
      const res = await apiClient.get("/worklogs", { params });
      setLogs(res.data.data || []);
    } catch { setMessage("Failed to load work logs"); }
  }

  async function loadReport() {
    try {
      const params: Record<string, string> = {};
      if (filterEmployee) params.employeeId = filterEmployee;
      if (filterFrom) params.fromDate = filterFrom;
      if (filterTo) params.toDate = filterTo;
      const res = await apiClient.get("/worklogs/report", { params });
      setReport(res.data.data || []);
    } catch { setMessage("Failed to load report"); }
  }

  useEffect(() => { if (view === "list") loadList(); }, [view]);
  useEffect(() => { if (view === "report") loadReport(); }, [view]);

  async function createLog() {
    try {
      if (!form.description.trim()) { setMessage("Description is required"); return; }
      await apiClient.post("/worklogs", { ...form, durationMins: Number(form.durationMins) });
      setMessage("Work log added");
      setShowCreate(false);
      setForm({ description: "", durationMins: "30", taskId: "", billable: true, date: new Date().toISOString().split("T")[0] });
      await load();
    } catch { setMessage("Failed to create work log"); }
  }

  async function deleteLog(id: string) {
    try { await apiClient.delete(`/worklogs/${id}`); setMessage("Work log deleted"); await load(); if (view === "list") loadList(); } catch { setMessage("Failed to delete"); }
  }

  async function approveLog(id: string) {
    try { await apiClient.post(`/worklogs/${id}/approve`); setMessage("Work log approved"); await load(); if (view === "list") loadList(); } catch { setMessage("Failed to approve"); }
  }

  const cards = [
    { label: "Total Logs", value: dashboard?.totalLogs || 0, icon: Clock, color: "text-blue-700" },
    { label: "Today's Logs", value: dashboard?.todayLogs || 0, icon: FileText, color: "text-indigo-600" },
    { label: "Today Hours", value: todayData?.totalHours || dashboard?.todayHours || 0, icon: Clock, color: "text-green-600", suffix: "h" },
    { label: "Pending Approval", value: dashboard?.pendingApprovals || 0, icon: CheckCircle2, color: "text-amber-600" },
  ];

  function timeDisplay(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function LogRow({ log }: { log: WorkLog }) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-black text-blue-600">{log.employee?.user?.name || "Unknown"}</p>
            {log.task && <span className="text-xs font-bold text-slate-400">#{log.task.taskNumber}</span>}
            {log.billable && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-black text-green-700">Billable</span>}
            {log.approved ? (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-black text-green-700">Approved</span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700">Pending</span>
            )}
          </div>
          <p className="mt-1 text-sm font-bold">{log.description}</p>
          <div className="mt-1 flex gap-4 text-xs font-semibold text-slate-400">
            <span>{new Date(log.date).toLocaleDateString()}</span>
            <span>{timeDisplay(log.durationMins)}</span>
            {log.task && <span>{log.task.title}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!log.approved && isAgent && (
            <button onClick={() => approveLog(log.id)} className="rounded-lg border border-green-200 bg-green-50 p-1.5 text-green-600 hover:bg-green-100" title="Approve"><CheckCircle2 size={15} /></button>
          )}
          <button onClick={() => deleteLog(log.id)} className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-500 hover:bg-red-100" title="Delete"><XCircle size={15} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.28em] text-blue-200">Phase 11</p>
            <h1 className="mt-3 text-4xl font-black">Work Log System</h1>
            <p className="mt-2 text-sm text-blue-100">Track time, daily reports, manager review and productivity.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex rounded-xl bg-white/10">
              {(["today", "list", "report"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-4 py-2 text-sm font-black transition ${view === v ? "bg-white text-blue-800" : "text-blue-100 hover:text-white"}`}>
                  {v === "today" ? "Today" : v === "list" ? "All Logs" : "Report"}
                </button>
              ))}
            </div>
            <button onClick={load} className="rounded-xl bg-white/10 p-3"><RefreshCcw size={18} /></button>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl bg-blue-50 p-4 text-sm font-bold text-blue-800">
          {message}
          <button onClick={() => setMessage("")} className="ml-3 text-blue-400 hover:text-blue-700"><XCircle size={16} className="inline" /></button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border bg-white p-4">
              <Icon className={card.color} size={20} />
              <p className="mt-3 text-xs font-black uppercase text-slate-400">{card.label}</p>
              <p className={`mt-1 text-2xl font-black ${card.color}`}>
                {typeof card.value === "number" ? card.value : "-"}{"suffix" in card ? ` ${(card as any).suffix}` : ""}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border bg-white p-6">
        {view === "today" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Today's Work Logs</h2>
              <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
                <Plus size={17} />{showCreate ? "Cancel" : "Log Work"}
              </button>
            </div>

            {todayData && (
              <div className="mt-2 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
                <p className="text-sm font-bold text-slate-500">Total tracked today</p>
                <p className="text-3xl font-black text-blue-700">{todayData.totalHours}h <span className="text-lg font-bold text-slate-400">({timeDisplay(todayData.totalMins)})</span></p>
              </div>
            )}

            {showCreate && (
              <div className="mt-4 space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <h3 className="font-black text-blue-800">Log Work</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className={field} placeholder="What did you work on?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  <input className={field} type="number" placeholder="Duration (mins)" value={form.durationMins} onChange={(e) => setForm({ ...form, durationMins: e.target.value })} />
                  <select className={field} value={form.taskId} onChange={(e) => setForm({ ...form, taskId: e.target.value })}>
                    <option value="">No task linked</option>
                    {tasks.map((t) => <option key={t.id} value={t.id}>{t.taskNumber} - {t.title}</option>)}
                  </select>
                  <input className={field} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <input type="checkbox" checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} className="h-4 w-4" />
                    Billable
                  </label>
                  <button onClick={createLog} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white">Save</button>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {(!todayData?.logs || todayData.logs.length === 0) && (
                <p className="py-8 text-center text-sm font-bold text-slate-400">No work logged today. Click "Log Work" to start.</p>
              )}
              {(todayData?.logs || []).map((log) => <LogRow key={log.id} log={log} />)}
            </div>
          </>
        )}

        {view === "list" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">All Work Logs</h2>
              <div className="flex flex-wrap gap-2">
                <input className={field + " w-40"} type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                {isAgent && (
                  <select className={field + " w-44"} value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
                    <option value="">All employees</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name}</option>)}
                  </select>
                )}
                <button onClick={loadList} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">Filter</button>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {logs.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No work logs found.</p>}
              {logs.map((log) => <LogRow key={log.id} log={log} />)}
            </div>
          </>
        )}

        {view === "report" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Daily Report</h2>
              <div className="flex flex-wrap gap-2">
                {isAgent && (
                  <select className={field + " w-44"} value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
                    <option value="">All employees</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name}</option>)}
                  </select>
                )}
                <input className={field + " w-36"} type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
                <input className={field + " w-36"} type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
                <button onClick={loadReport} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">Generate</button>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {report.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No data for selected period.</p>}
              {report.map((group) => (
                <div key={group.date} className="rounded-2xl border bg-slate-50 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black">{new Date(group.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</h3>
                    <div className="flex gap-4 text-sm font-bold">
                      <span className="text-blue-700">{group.totalHours}h total</span>
                      <span className="text-green-700">{Math.round(group.billableMins / 6) / 10}h billable</span>
                      <span className="text-slate-500">{group.count} entries</span>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {group.logs.map((log) => <LogRow key={log.id} log={log} />)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
