import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  Layers3,
  Network,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { apiClient } from "../api/client";
import { getUser } from "../lib/auth";

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
  const user = getUser();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await apiClient.get("/organization/summary");
        setSummary(response.data.data);
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, []);

  const cards = [
    {
      title: "Departments",
      value: summary?.departments ?? 0,
      icon: Building2,
      helper: "Company departments",
    },
    {
      title: "Employees",
      value: summary?.employees ?? 0,
      icon: UsersRound,
      helper: "Registered employees",
    },
    {
      title: "Teams",
      value: summary?.teams ?? 0,
      icon: Layers3,
      helper: "Active working teams",
    },
    {
      title: "Reporting",
      value: summary?.reportingHierarchyRecords ?? 0,
      icon: Network,
      helper: "Hierarchy records",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 p-8 text-white shadow-2xl shadow-blue-100">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-blue-50 ring-1 ring-white/20">
              <ShieldCheck size={18} />
              Secure Role Based ERP
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
              Welcome back, {user?.name || "Admin"}.
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-blue-50 md:text-base">
              Your AdScale One ERP frontend is now connected with backend APIs.
              This dashboard will become the control center for HR, CRM,
              projects, tickets, teams and clients.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/20">
            <p className="text-sm font-bold text-blue-100">Active Users</p>
            <p className="mt-2 text-5xl font-black">
              {loading ? "..." : summary?.activeUsers ?? 0}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-50"
            >
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <Icon size={24} />
                </div>

                <p className="text-4xl font-black text-slate-950">
                  {loading ? "..." : card.value}
                </p>
              </div>

              <p className="mt-5 text-base font-black text-slate-900">
                {card.title}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {card.helper}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <Activity size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">
                System Progress
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Current development status
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {[
              ["Backend Phase 1", "Auth + Security", "100%"],
              ["Backend Phase 2", "Organization Management", "100%"],
              ["Frontend Phase 1", "Admin Foundation", "Running"],
            ].map(([phase, title, status]) => (
              <div
                key={phase}
                className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-black text-slate-900">{phase}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {title}
                  </p>
                </div>

                <span className="w-fit rounded-full bg-blue-600 px-4 py-2 text-xs font-black text-white">
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Quick Summary</h2>

          <div className="mt-5 space-y-4">
            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-bold text-slate-500">Users</span>
              <span className="text-sm font-black text-slate-950">
                {summary?.users ?? 0}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-bold text-slate-500">Roles</span>
              <span className="text-sm font-black text-slate-950">
                {summary?.roles ?? 0}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-100 pb-3">
              <span className="text-sm font-bold text-slate-500">
                Designations
              </span>
              <span className="text-sm font-black text-slate-950">
                {summary?.designations ?? 0}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm font-bold text-slate-500">
                Team Members
              </span>
              <span className="text-sm font-black text-slate-950">
                {summary?.teamMembers ?? 0}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;