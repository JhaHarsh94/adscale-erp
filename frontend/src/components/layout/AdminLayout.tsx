import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CheckSquare,
  Clock,
  FolderKanban,
  Folder,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  MessageCircle,
  Radio,
  Shield,
  Ticket,
  UsersRound,
  Video,
  ClipboardList,
  BookOpen,
  UserCheck,
  UserPlus,
  X,
  CalendarCheck,
  CalendarDays,
  FileSignature,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { getUser, logout } from "../../lib/auth";
import NotificationBell from "./NotificationBell";

const navItems: { label: string; path: string; icon: any; roles: string[] }[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD", "SALES_MANAGER", "EMPLOYEE"] },
  { label: "Departments", path: "/organization/departments", icon: Building2, roles: ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"] },
  { label: "Employees", path: "/employees", icon: UsersRound, roles: ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"] },
  { label: "Teams", path: "/organization/teams", icon: Layers3, roles: ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"] },
  { label: "Projects", path: "/projects", icon: FolderKanban, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "SALES_MANAGER", "TEAM_LEAD", "EMPLOYEE"] },
  { label: "Tasks", path: "/tasks", icon: CheckSquare, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD", "SALES_MANAGER", "EMPLOYEE"] },
  { label: "Work Logs", path: "/worklogs", icon: Clock, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD", "SALES_MANAGER", "EMPLOYEE"] },
  { label: "Approvals", path: "/approvals", icon: Shield, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD", "SALES_MANAGER", "EMPLOYEE"] },
  { label: "Files", path: "/files", icon: Folder, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD", "SALES_MANAGER", "EMPLOYEE"] },
  { label: "Chat", path: "/chat", icon: MessageCircle, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD", "SALES_MANAGER", "EMPLOYEE"] },
  { label: "Meetings", path: "/meetings", icon: Video, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD", "SALES_MANAGER", "EMPLOYEE"] },
  { label: "Meeting Mgmt", path: "/meeting-management", icon: ClipboardList, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD", "SALES_MANAGER", "EMPLOYEE"] },
  { label: "Knowledge Base", path: "/knowledge-base", icon: BookOpen, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD", "SALES_MANAGER", "EMPLOYEE"] },
  { label: "HRMS", path: "/hrms", icon: UserCheck, roles: ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"] },
  { label: "Recruitment", path: "/recruitment", icon: UserPlus, roles: ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"] },
  { label: "SEO", path: "/seo", icon: TrendingUp, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "SALES_MANAGER"] },
  { label: "Payroll", path: "/payroll", icon: IndianRupee, roles: ["SUPER_ADMIN", "DIRECTOR", "HR", "OPERATIONS_MANAGER"] },
  { label: "Tickets", path: "/tickets", icon: Ticket, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD", "SALES_MANAGER", "EMPLOYEE"] },
  { label: "CRM", path: "/crm", icon: BarChart3, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "SALES_MANAGER", "HR"] },
  { label: "Lead Studio", path: "/lead-studio", icon: Radio, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "SALES_MANAGER", "HR"] },
  { label: "Client Portal", path: "/client-users", icon: UsersRound, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "SALES_MANAGER"] },
  { label: "Proposals & Quotes", path: "/commercial", icon: FileSignature, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "SALES_MANAGER"] },
  { label: "Users", path: "/users", icon: UsersRound, roles: ["SUPER_ADMIN"] },
  { label: "Attendance", path: "/attendance", icon: CalendarCheck, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD", "SALES_MANAGER", "EMPLOYEE"] },
  { label: "Leave Management", path: "/leave-management", icon: CalendarDays, roles: ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "HR", "TEAM_LEAD", "SALES_MANAGER", "EMPLOYEE"] },
];

function AdminLayout() {
  const navigate = useNavigate();
  const user = getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 max-w-[85vw] border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 md:px-5 py-4 md:py-5">
            <div>
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-blue-600">AdScale</p>
              <h1 className="text-lg md:text-xl font-black text-slate-950">One ERP</h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="rounded-xl border border-slate-200 p-2 lg:hidden"><X size={18} /></button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-2 md:px-3 py-3 md:py-5">
            {navItems.filter((item) => !item.roles || item.roles.includes(user?.role?.name || "")).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 md:gap-3 rounded-2xl px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-bold transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                        : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                    }`
                  }
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 p-3 md:p-4">
            <div className="rounded-2xl bg-slate-50 p-3 md:p-4">
              <p className="text-xs md:text-sm font-black text-slate-900 truncate">{user?.name || "Admin"}</p>
              <p className="mt-1 truncate text-[10px] md:text-xs font-semibold text-slate-500">{user?.email || "admin@adscale.com"}</p>
              <p className="mt-1.5 md:mt-2 inline-flex rounded-full bg-blue-50 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-black text-blue-700">{user?.role?.name || "SUPER_ADMIN"}</p>
            </div>
            <button onClick={handleLogout} className="mt-2 md:mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 md:py-3 text-xs md:text-sm font-black text-slate-700 hover:bg-slate-50"><LogOut size={16} /> Logout</button>
          </div>
        </div>
      </aside>

      <section className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <button onClick={() => setSidebarOpen(true)} className="rounded-xl border border-slate-200 bg-white p-2 lg:hidden shrink-0"><Menu size={18} /></button>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.22em] text-blue-600 truncate">ERP Command Center</p>
                <h2 className="text-base md:text-lg font-black text-slate-950 truncate">Admin Dashboard</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <NotificationBell />
              <button onClick={handleLogout} className="flex rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 lg:hidden" title="Logout"><LogOut size={18} /></button>
              <div className="hidden rounded-2xl border border-slate-200 bg-white px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold text-slate-600 shadow-sm md:block truncate max-w-[150px]">{user?.name || "Admin"}</div>
            </div>
          </div>
        </header>

        <div className="p-3 md:p-5 lg:p-8">
          <Outlet />
        </div>
      </section>
    </main>
  );
}

export default AdminLayout;
