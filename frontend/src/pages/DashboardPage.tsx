import { useEffect, useState } from "react";
import { Building2, Layers3, LogOut, Network, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { getUser, logout } from "../lib/auth";

interface Summary {
  roles: number;
  departments: number;
  designations: number;
  users: number;
  activeUsers: number;
  employees: number;
  teams: number;
  teamMembers: number;
  reportingHierarchyRecords: number;
}

function DashboardPage() {
  const navigate = useNavigate();
  const user = getUser();

  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    async function loadSummary() {
      const response = await apiClient.get("/organization/summary");
      setSummary(response.data.data);
    }

    loadSummary();
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const cards = [
    {
      title: "Departments",
      value: summary?.departments ?? 0,
      icon: Building2,
    },
    {
      title: "Employees",
      value: summary?.employees ?? 0,
      icon: UsersRound,
    },
    {
      title: "Teams",
      value: summary?.teams ?? 0,
      icon: Layers3,
    },
    {
      title: "Reporting Records",
      value: summary?.reportingHierarchyRecords ?? 0,
      icon: Network,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-600">
              AdScale One ERP
            </p>
            <h1 className="text-xl font-black text-slate-950">
              Super Admin Dashboard
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="rounded-[2rem] bg-gradient-to-br from-emerald-600 to-slate-950 p-8 text-white shadow-2xl shadow-emerald-100">
          <p className="text-sm font-bold text-emerald-100">
            Welcome, {user?.name || "Admin"}
          </p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">
            Organization command center is live.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50">
            Your backend APIs are connected with the React frontend. This is the
            first working admin dashboard foundation.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                    <Icon size={24} />
                  </div>
                  <p className="text-3xl font-black text-slate-950">
                    {card.value}
                  </p>
                </div>

                <p className="mt-5 text-sm font-bold text-slate-500">
                  {card.title}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;