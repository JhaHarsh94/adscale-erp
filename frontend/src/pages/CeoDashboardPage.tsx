import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckSquare,
  ClipboardList,
  Clock,
  Crown,
  FileSignature,
  FolderKanban,
  IndianRupee,
  Layers3,
  LayoutDashboard,
  MessageCircle,
  Plus,
  RefreshCcw,
  Target,
  Ticket,
  TrendingUp,
  UserCheck,
  UserPlus,
  UsersRound,
  Video,
  Share2,
  Wallet,
} from "lucide-react";
import { apiClient } from "../api/client";

interface CeoOverview {
  organization: { totalUsers: number; activeUsers: number; totalRoles: number; totalDepartments: number; totalDesignations: number; totalEmployees: number; totalTeams: number };
  projects: { total: number; byStatus: { status: string; _count: number }[] };
  tasks: { total: number; byStatus: { status: string; _count: number }[] };
  tickets: { total: number; byStatus: { status: string; _count: number }[] };
  crm: { totalClients: number; totalLeads: number; leadsByStatus: { status: string; _count: number }[] };
  commercial: { totalProposals: number; totalQuotations: number; totalContracts: number };
  attendance: { presentToday: number };
}

interface ModuleStats {
  users: number; employees: number; projects: number; tasks: number; tickets: number;
  clients: number; leads: number; proposals: number; contracts: number;
  presentToday: number; onLeave: number; chats: number; meetings: number;
  payrolls: number; seoProjects: number; socialPosts: number; googleCampaigns: number; metaCampaigns: number;
}

interface RecentActivity {
  recentUsers: { id: string; name: string; email: string; createdAt: string }[];
  recentProjects: { id: string; name: string; status: string; createdAt: string }[];
  recentTickets: { id: string; title: string; status: string; priority: string; createdAt: string }[];
  recentTasks: { id: string; title: string; status: string; priority: string; createdAt: string }[];
  recentLeads: { id: string; companyName: string; status: string; createdAt: string }[];
  recentClients: { id: string; name: string; status: string; createdAt: string }[];
}

type QuickActionTab = "employee" | "project" | "task" | "ticket";

const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-amber-500 focus:bg-white";
const select = input + " appearance-none";

const moduleLinks = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, color: "bg-blue-50 text-blue-700" },
  { label: "Employees", path: "/employees", icon: UsersRound, color: "bg-emerald-50 text-emerald-700" },
  { label: "Projects", path: "/projects", icon: FolderKanban, color: "bg-violet-50 text-violet-700" },
  { label: "Tasks", path: "/tasks", icon: CheckSquare, color: "bg-indigo-50 text-indigo-700" },
  { label: "Tickets", path: "/tickets", icon: Ticket, color: "bg-rose-50 text-rose-700" },
  { label: "CRM", path: "/crm", icon: BarChart3, color: "bg-cyan-50 text-cyan-700" },
  { label: "Analytics", path: "/analytics", icon: TrendingUp, color: "bg-violet-50 text-violet-700" },
  { label: "Attendance", path: "/attendance", icon: CalendarCheck, color: "bg-amber-50 text-amber-700" },
  { label: "Payroll", path: "/payroll", icon: IndianRupee, color: "bg-green-50 text-green-700" },
  { label: "HRMS", path: "/hrms", icon: UserCheck, color: "bg-pink-50 text-pink-700" },
  { label: "Recruitment", path: "/recruitment", icon: UserPlus, color: "bg-purple-50 text-purple-700" },
  { label: "Work Logs", path: "/worklogs", icon: Clock, color: "bg-orange-50 text-orange-700" },
  { label: "Approvals", path: "/approvals", icon: ClipboardList, color: "bg-teal-50 text-teal-700" },
  { label: "Chat", path: "/chat", icon: MessageCircle, color: "bg-sky-50 text-sky-700" },
  { label: "Meetings", path: "/meetings", icon: Video, color: "bg-red-50 text-red-700" },
  { label: "SEO", path: "/seo", icon: TrendingUp, color: "bg-lime-50 text-lime-700" },
  { label: "Social", path: "/social-media", icon: Share2, color: "bg-fuchsia-50 text-fuchsia-700" },
  { label: "Google Ads", path: "/google-ads", icon: Wallet, color: "bg-blue-50 text-blue-700" },
  { label: "Meta Ads", path: "/meta-ads", icon: Target, color: "bg-indigo-50 text-indigo-700" },
  { label: "Commercial", path: "/commercial", icon: FileSignature, color: "bg-emerald-50 text-emerald-700" },
];

export default function CeoDashboardPage() {
  const [overview, setOverview] = useState<CeoOverview | null>(null);
  const [moduleStats, setModuleStats] = useState<ModuleStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [qaTab, setQaTab] = useState<QuickActionTab>("employee");

  /* Quick action forms */
  const [empForm, setEmpForm] = useState({ name: "", email: "", password: "Temp@1234", phone: "", designationId: "", departmentId: "", joiningDate: "", salary: "" });
  const [projForm, setProjForm] = useState({ name: "", clientId: "", managerId: "", startDate: "", endDate: "", budget: "", description: "" });
  const [taskForm, setTaskForm] = useState({ title: "", projectId: "", assignedToId: "", priority: "MEDIUM", dueDate: "", description: "" });
  const [ticketForm, setTicketForm] = useState({ title: "", description: "", clientId: "", projectId: "", priority: "MEDIUM" });
  const [saForm, setSaForm] = useState({ name: "", email: "", password: "Admin@123" });

  const msg = (s: string) => { setMessage(s); setTimeout(() => setMessage(""), 4000); };

  async function loadAll() {
    setBusy(true);
    try {
      const [o, m, a] = await Promise.all([
        apiClient.get("/ceo/overview"),
        apiClient.get("/ceo/module-stats"),
        apiClient.get("/ceo/recent-activity"),
      ]);
      setOverview(o.data.data);
      setModuleStats(m.data.data);
      setActivity(a.data.data);
    } catch { msg("Could not load CEO dashboard"); }
    finally { setBusy(false); }
  }

  useEffect(() => { void loadAll(); }, []);

  async function createEmployee() {
    if (!empForm.name || !empForm.email) return msg("Name and email required");
    setBusy(true);
    try { await apiClient.post("/ceo/create-employee", empForm); msg("Employee created"); setEmpForm({ name: "", email: "", password: "Temp@1234", phone: "", designationId: "", departmentId: "", joiningDate: "", salary: "" }); await loadAll(); }
    catch { msg("Could not create employee"); }
    finally { setBusy(false); }
  }

  async function createProject() {
    if (!projForm.name || !projForm.clientId) return msg("Name and client required");
    setBusy(true);
    try { await apiClient.post("/ceo/create-project", projForm); msg("Project created"); setProjForm({ name: "", clientId: "", managerId: "", startDate: "", endDate: "", budget: "", description: "" }); await loadAll(); }
    catch { msg("Could not create project"); }
    finally { setBusy(false); }
  }

  async function createTask() {
    if (!taskForm.title || !taskForm.projectId) return msg("Title and project required");
    setBusy(true);
    try { await apiClient.post("/ceo/create-task", taskForm); msg("Task created"); setTaskForm({ title: "", projectId: "", assignedToId: "", priority: "MEDIUM", dueDate: "", description: "" }); await loadAll(); }
    catch { msg("Could not create task"); }
    finally { setBusy(false); }
  }

  async function createTicket() {
    if (!ticketForm.title) return msg("Title required");
    setBusy(true);
    try { await apiClient.post("/ceo/create-ticket", ticketForm); msg("Ticket created"); setTicketForm({ title: "", description: "", clientId: "", projectId: "", priority: "MEDIUM" }); await loadAll(); }
    catch { msg("Could not create ticket"); }
    finally { setBusy(false); }
  }

  async function createSuperAdmin() {
    if (!saForm.name || !saForm.email || !saForm.password) return msg("Name, email, and password required");
    setBusy(true);
    try { await apiClient.post("/ceo/create-super-admin", saForm); msg(`Super Admin "${saForm.name}" created`); setSaForm({ name: "", email: "", password: "Admin@123" }); await loadAll(); }
    catch (e: any) { msg(e?.response?.data?.message || "Could not create Super Admin"); }
    finally { setBusy(false); }
  }

  const statCard = (label: string, value: number | string, icon: any, color: string) => (
    <div className="rounded-2xl border bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center justify-between">
        <div className={`rounded-xl p-2.5 ${color}`}>{icon}</div>
        <p className="text-3xl font-black text-slate-900">{value}</p>
      </div>
      <p className="mt-3 text-sm font-bold text-slate-500">{label}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[2rem] bg-gradient-to-br from-amber-600 via-orange-700 to-slate-950 p-8 text-white">
        <div className="flex items-center gap-3">
          <Crown size={32} className="text-amber-200" />
          <div>
            <p className="text-xs font-black uppercase tracking-[.28em] text-amber-200">Command Center</p>
            <h1 className="text-4xl font-black">CEO Dashboard</h1>
            <p className="mt-2 text-sm text-amber-100">Full system overview and control — create, monitor, and manage every module.</p>
          </div>
        </div>
        <button onClick={loadAll} disabled={busy} className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-black"><RefreshCcw size={17} /> Refresh</button>
      </section>

      {message && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{message}</div>}

      {/* Organization Overview Cards */}
      {overview && (
        <section className="grid gap-3 md:grid-cols-7">
          {statCard("Users", overview.organization.totalUsers, <UsersRound size={20} />, "bg-blue-50 text-blue-700")}
          {statCard("Active", overview.organization.activeUsers, <Activity size={20} />, "bg-emerald-50 text-emerald-700")}
          {statCard("Employees", overview.organization.totalEmployees, <UsersRound size={20} />, "bg-violet-50 text-violet-700")}
          {statCard("Departments", overview.organization.totalDepartments, <Building2 size={20} />, "bg-indigo-50 text-indigo-700")}
          {statCard("Teams", overview.organization.totalTeams, <Layers3 size={20} />, "bg-cyan-50 text-cyan-700")}
          {statCard("Roles", overview.organization.totalRoles, <Crown size={20} />, "bg-amber-50 text-amber-700")}
          {statCard("Designations", overview.organization.totalDesignations, <ClipboardList size={20} />, "bg-rose-50 text-rose-700")}
        </section>
      )}

      {/* Module Stats */}
      {moduleStats && (
        <section className="grid gap-3 md:grid-cols-6">
          {statCard("Projects", moduleStats.projects, <FolderKanban size={20} />, "bg-violet-50 text-violet-700")}
          {statCard("Tasks", moduleStats.tasks, <CheckSquare size={20} />, "bg-indigo-50 text-indigo-700")}
          {statCard("Tickets", moduleStats.tickets, <Ticket size={20} />, "bg-rose-50 text-rose-700")}
          {statCard("Clients", moduleStats.clients, <UsersRound size={20} />, "bg-emerald-50 text-emerald-700")}
          {statCard("Leads", moduleStats.leads, <TrendingUp size={20} />, "bg-cyan-50 text-cyan-700")}
          {statCard("Present Today", moduleStats.presentToday, <CalendarCheck size={20} />, "bg-green-50 text-green-700")}
          {statCard("On Leave", moduleStats.onLeave, <Clock size={20} />, "bg-orange-50 text-orange-700")}
          {statCard("Proposals", moduleStats.proposals, <FileSignature size={20} />, "bg-emerald-50 text-emerald-700")}
          {statCard("Contracts", moduleStats.contracts, <FileSignature size={20} />, "bg-blue-50 text-blue-700")}
          {statCard("Payrolls", moduleStats.payrolls, <IndianRupee size={20} />, "bg-green-50 text-green-700")}
          {statCard("Chat Rooms", moduleStats.chats, <MessageCircle size={20} />, "bg-sky-50 text-sky-700")}
          {statCard("Meetings", moduleStats.meetings, <Video size={20} />, "bg-red-50 text-red-700")}
          {statCard("SEO Projects", moduleStats.seoProjects, <TrendingUp size={20} />, "bg-lime-50 text-lime-700")}
          {statCard("Social Posts", moduleStats.socialPosts, <Share2 size={20} />, "bg-fuchsia-50 text-fuchsia-700")}
          {statCard("Google Ads", moduleStats.googleCampaigns, <Wallet size={20} />, "bg-blue-50 text-blue-700")}
          {statCard("Meta Ads", moduleStats.metaCampaigns, <Target size={20} />, "bg-indigo-50 text-indigo-700")}
        </section>
      )}

      {/* Quick Actions */}
      <section className="rounded-2xl border bg-white p-6">
        <div className="flex items-center gap-2">
          <Plus className="text-amber-700" />
          <h2 className="text-xl font-black">Quick Actions</h2>
        </div>
        <div className="mt-4 flex gap-2 rounded-xl bg-slate-100 p-1.5">
          {(["employee", "project", "task", "ticket"] as const).map(t => (
            <button key={t} onClick={() => setQaTab(t)} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-black capitalize ${qaTab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{t}</button>
          ))}
        </div>

        {qaTab === "employee" && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input className={input} value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} placeholder="Full name" />
            <input className={input} value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} placeholder="Email" />
            <input className={input} value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} placeholder="Phone" />
            <input className={input} type="date" value={empForm.joiningDate} onChange={e => setEmpForm({ ...empForm, joiningDate: e.target.value })} />
            <input className={input} type="number" value={empForm.salary} onChange={e => setEmpForm({ ...empForm, salary: e.target.value })} placeholder="Salary" />
            <button disabled={busy} onClick={createEmployee} className="col-span-full flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-sm font-black text-white"><UserPlus size={17} /> Create Employee</button>
          </div>
        )}

        {qaTab === "project" && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input className={input} value={projForm.name} onChange={e => setProjForm({ ...projForm, name: e.target.value })} placeholder="Project name" />
            <input className={input} value={projForm.clientId} onChange={e => setProjForm({ ...projForm, clientId: e.target.value })} placeholder="Client ID" />
            <input className={input} type="date" value={projForm.startDate} onChange={e => setProjForm({ ...projForm, startDate: e.target.value })} />
            <input className={input} type="date" value={projForm.endDate} onChange={e => setProjForm({ ...projForm, endDate: e.target.value })} />
            <input className={input} type="number" value={projForm.budget} onChange={e => setProjForm({ ...projForm, budget: e.target.value })} placeholder="Budget" />
            <input className={input} value={projForm.description} onChange={e => setProjForm({ ...projForm, description: e.target.value })} placeholder="Description" />
            <button disabled={busy} onClick={createProject} className="col-span-full flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-sm font-black text-white"><FolderKanban size={17} /> Create Project</button>
          </div>
        )}

        {qaTab === "task" && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input className={input} value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title" />
            <input className={input} value={taskForm.projectId} onChange={e => setTaskForm({ ...taskForm, projectId: e.target.value })} placeholder="Project ID" />
            <select className={select} value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select>
            <input className={input} type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
            <input className={input} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Description" />
            <button disabled={busy} onClick={createTask} className="col-span-full flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-sm font-black text-white"><CheckSquare size={17} /> Create Task</button>
          </div>
        )}

        {qaTab === "ticket" && (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input className={input} value={ticketForm.title} onChange={e => setTicketForm({ ...ticketForm, title: e.target.value })} placeholder="Ticket title" />
            <input className={input} value={ticketForm.clientId} onChange={e => setTicketForm({ ...ticketForm, clientId: e.target.value })} placeholder="Client ID" />
            <input className={input} value={ticketForm.projectId} onChange={e => setTicketForm({ ...ticketForm, projectId: e.target.value })} placeholder="Project ID" />
            <select className={select} value={ticketForm.priority} onChange={e => setTicketForm({ ...ticketForm, priority: e.target.value })}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select>
            <input className={input} value={ticketForm.description} onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })} placeholder="Description" />
            <button disabled={busy} onClick={createTicket} className="col-span-full flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-sm font-black text-white"><Ticket size={17} /> Create Ticket</button>
          </div>
        )}
      </section>

      {/* Create Super Admin */}
      <section className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
        <div className="flex items-center gap-2">
          <Crown className="text-amber-700" />
          <h2 className="text-xl font-black text-amber-900">Create Super Admin</h2>
        </div>
        <p className="mt-1 text-sm font-semibold text-amber-700">Grant full system access to a new administrator.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input className={input + " border-amber-300 bg-white"} value={saForm.name} onChange={e => setSaForm({ ...saForm, name: e.target.value })} placeholder="Full name" />
          <input className={input + " border-amber-300 bg-white"} value={saForm.email} onChange={e => setSaForm({ ...saForm, email: e.target.value })} placeholder="Email" />
          <input className={input + " border-amber-300 bg-white"} value={saForm.password} onChange={e => setSaForm({ ...saForm, password: e.target.value })} placeholder="Password" />
          <button disabled={busy} onClick={createSuperAdmin} className="flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-sm font-black text-white hover:bg-amber-800"><Crown size={17} /> Create Super Admin</button>
        </div>
      </section>

      {/* Recent Activity + Module Shortcuts */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Recent Activity */}
        <section className="rounded-2xl border bg-white p-6">
          <div className="flex items-center gap-2">
            <Activity className="text-amber-700" />
            <h2 className="text-xl font-black">Recent Activity</h2>
          </div>
          <div className="mt-5 space-y-4">
            {activity && (
              <>
                {activity.recentUsers.length > 0 && (
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">New Users</p>
                    {activity.recentUsers.map(u => (
                      <div key={u.id} className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <div><p className="text-sm font-black text-slate-900">{u.name}</p><p className="text-xs font-semibold text-slate-500">{u.email}</p></div>
                        <span className="text-xs font-bold text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activity.recentProjects.length > 0 && (
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">New Projects</p>
                    {activity.recentProjects.map(p => (
                      <div key={p.id} className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <p className="text-sm font-black text-slate-900">{p.name}</p>
                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">{p.status}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activity.recentTickets.length > 0 && (
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">New Tickets</p>
                    {activity.recentTickets.map(t => (
                      <div key={t.id} className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <div><p className="text-sm font-black text-slate-900">{t.title}</p><p className="text-xs font-semibold text-slate-500">{t.priority}</p></div>
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">{t.status}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activity.recentLeads.length > 0 && (
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">New Leads</p>
                    {activity.recentLeads.map(l => (
                      <div key={l.id} className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <p className="text-sm font-black text-slate-900">{l.companyName}</p>
                        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">{l.status}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activity.recentClients.length > 0 && (
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">New Clients</p>
                    {activity.recentClients.map(c => (
                      <div key={c.id} className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                        <p className="text-sm font-black text-slate-900">{c.name}</p>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{c.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {(!activity || (!activity.recentUsers.length && !activity.recentProjects.length)) && (
              <p className="text-sm font-bold text-slate-400">No recent activity yet.</p>
            )}
          </div>
        </section>

        {/* Module Shortcuts */}
        <section className="rounded-2xl border bg-white p-6">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-amber-700" />
            <h2 className="text-xl font-black">All Modules</h2>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {moduleLinks.map(m => {
              const Icon = m.icon;
              return (
                <a key={m.path} href={m.path} className="flex items-center gap-2 rounded-xl p-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900">
                  <div className={`rounded-lg p-1.5 ${m.color}`}><Icon size={16} /></div>
                  {m.label}
                </a>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
