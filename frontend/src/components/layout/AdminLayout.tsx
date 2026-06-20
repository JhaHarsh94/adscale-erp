import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  FolderKanban,
  LayoutDashboard,
  Layers3,
  LogOut,
  Menu,
  Settings,
  Ticket,
  UsersRound,
  X,
} from "lucide-react";
import { getUser, logout } from "../../lib/auth";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Departments",
    path: "/organization/departments",
    icon: Building2,
  },
  {
    label: "Employees",
    path: "/employees",
    icon: UsersRound,
  },
  {
    label: "Teams",
    path: "/organization/teams",
    icon: Layers3,
  },
  {
    label: "Projects",
    path: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Tickets",
    path: "/tickets",
    icon: Ticket,
  },
  {
    label: "CRM",
    path: "/crm",
    icon: BarChart3,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
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
        className={`fixed left-0 top-0 z-40 h-screen w-72 border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600">
                AdScale
              </p>
              <h1 className="text-xl font-black text-slate-950">One ERP</h1>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-xl border border-slate-200 p-2 lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                        : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                    }`
                  }
                >
                  <Icon size={19} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 p-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">
                {user?.name || "Admin"}
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                {user?.email || "admin@adscale.com"}
              </p>
              <p className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                {user?.role?.name || "SUPER_ADMIN"}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <section className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2 lg:hidden"
              >
                <Menu size={20} />
              </button>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                  ERP Command Center
                </p>
                <h2 className="text-lg font-black text-slate-950">
                  Admin Dashboard
                </h2>
              </div>
            </div>

            <div className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm md:block">
              {user?.name || "Admin"}
            </div>
          </div>
        </header>

        <div className="p-5 md:p-8">
          <Outlet />
        </div>
      </section>
    </main>
  );
}

export default AdminLayout;