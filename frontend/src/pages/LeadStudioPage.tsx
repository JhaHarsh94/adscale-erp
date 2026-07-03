import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Database,
  ExternalLink,
  Filter,
  Loader2,
  RefreshCcw,
  Search,
  Zap,
} from "lucide-react";
import { apiClient } from "../api/client";
import { getSocket } from "../lib/socket";
import { getUser } from "../lib/auth";
import type { Lead } from "../types/crm";

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-fuchsia-500",
  CONTACTED: "bg-amber-500",
  QUALIFIED: "bg-emerald-500",
  PROPOSAL_SENT: "bg-violet-500",
  NEGOTIATION: "bg-orange-500",
  WON: "bg-green-600",
  LOST: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

const SOURCE_GLYPHS: Record<string, string> = {
  GOOGLE_ADS: "G",
  META_ADS: "M",
  SOCIAL_MEDIA: "S",
  WEBSITE: "W",
  REFERRAL: "R",
  EMAIL_CAMPAIGN: "E",
  PHONE: "P",
  WALK_IN: "W",
  OTHER: "O",
};

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = display;
    const diff = value - start;
    if (diff === 0) return;

    const duration = 600;
    const steps = 20;
    const increment = diff / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(start + increment * step));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span ref={ref}>{display.toLocaleString("en-IN")}</span>;
}

function LeadStudioPage() {
  const user = getUser();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sheetStatus, setSheetStatus] = useState<{
    connected: boolean;
    leadCount: number;
  } | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncMsgType, setSyncMsgType] = useState<"success" | "error">("success");
  const [newLeadId, setNewLeadId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        !search ||
        lead.companyName.toLowerCase().includes(search.toLowerCase()) ||
        (lead.contactName?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (lead.email?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (lead.phone || "").includes(search);

      const matchesStatus =
        statusFilter === "ALL" || lead.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [leads, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: leads.length,
      new: leads.filter((l) => l.status === "NEW").length,
      contacted: leads.filter((l) => l.status === "CONTACTED").length,
      qualified: leads.filter((l) => l.status === "QUALIFIED").length,
      won: leads.filter((l) => l.status === "WON").length,
    };
  }, [leads]);

  async function loadLeads() {
    try {
      const res = await apiClient.get("/crm/leads");
      setLeads(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function checkSheet() {
    try {
      const res = await apiClient.get("/crm/leads/sheet-status");
      setSheetStatus(res.data.data);
    } catch {
      setSheetStatus(null);
    }
  }

  async function handleSyncToSheet() {
    setSheetLoading(true);
    setSyncMsg(null);
    try {
      const res = await apiClient.post("/crm/leads/sync-to-sheet");
      const d = res.data.data;
      if (d.failed > 0 && d.synced === 0) {
        setSyncMsg("Google Sheets not configured. Deploy the free Apps Script first.");
        setSyncMsgType("error");
      } else {
        setSyncMsg(`Synced ${d.synced} leads to sheet (${d.failed} failed)`);
        setSyncMsgType(d.failed > 0 ? "error" : "success");
      }
      await checkSheet();
    } catch (err: any) {
      setSyncMsg(err?.response?.data?.message || "Sync failed");
      setSyncMsgType("error");
    } finally {
      setSheetLoading(false);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  }

  async function handleImportFromSheet() {
    setSheetLoading(true);
    setSyncMsg(null);
    try {
      const { data } = await apiClient.post("/crm/leads/import-from-sheet");
      const result = data.data;
      if (result.imported > 0) {
        setSyncMsg(`Imported ${result.imported} leads from sheet (${result.errors} errors)`);
        setSyncMsgType(result.errors > 0 ? "error" : "success");
        loadLeads();
      } else {
        setSyncMsg(result.errors > 0 ? `Import failed (${result.errors} errors)` : "No new leads to import");
        setSyncMsgType(result.errors > 0 ? "error" : "success");
      }
      if (result.recentLeads) {
        setLeads((prev) => {
          const existingIds = new Set(prev.map((l) => l.id));
          const newOnes = result.recentLeads.filter(
            (l: Lead) => !existingIds.has(l.id)
          );
          return [...newOnes, ...prev];
        });
      }
      await checkSheet();
    } catch (err: any) {
      setSyncMsg(err?.response?.data?.message || "Import failed");
      setSyncMsgType("error");
    } finally {
      setSheetLoading(false);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  }

  useEffect(() => {
    loadLeads();
    checkSheet();

    if (user?.id) {
      const socket = getSocket();
      if (!socket) return;

      socket.on("lead:created", (lead: Lead) => {
        setLeads((prev) => {
          if (prev.some((l) => l.id === lead.id)) return prev;
          setNewLeadId(lead.id);
          setTimeout(() => setNewLeadId(null), 3000);
          return [lead, ...prev];
        });
      });

      socket.on("lead:updated", (lead: Lead) => {
        setLeads((prev) =>
          prev.map((l) => (l.id === lead.id ? lead : l))
        );
      });

      socket.on("lead:deleted", ({ id }: { id: string }) => {
        setLeads((prev) => prev.filter((l) => l.id !== id));
      });

      socket.on("leads:imported", () => {
        loadLeads();
      });

      return () => {
        socket.off("lead:created");
        socket.off("lead:updated");
        socket.off("lead:deleted");
        socket.off("leads:imported");
      };
    }
  }, [user?.id]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-purple-950 to-fuchsia-950 p-8 text-white shadow-2xl shadow-purple-100/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(236,72,153,0.1),transparent_50%)]" />

        <div className="relative z-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-fuchsia-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-400" />
                </span>
                Live Studio
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Lead Studio
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-purple-200/70">
                Realtime lead stream synced with Google Sheets. Every new lead
                appears instantly across your team.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSyncToSheet}
                disabled={sheetLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white ring-1 ring-white/10 backdrop-blur hover:bg-white/10 disabled:opacity-50"
              >
                {sheetLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowUpRight size={16} />
                )}
                Sync to Sheet
              </button>

              <button
                onClick={handleImportFromSheet}
                disabled={sheetLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white ring-1 ring-white/10 backdrop-blur hover:bg-white/10 disabled:opacity-50"
              >
                {sheetLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Database size={16} />
                )}
                Import from Sheet
              </button>

              <button
                onClick={loadLeads}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-60"
              >
                <RefreshCcw size={16} />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs font-bold text-purple-300">Total Leads</p>
              <p className="mt-2 text-4xl font-black text-white">
                {loading ? "..." : <AnimatedNumber value={stats.total} />}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs font-bold text-fuchsia-300">New</p>
              <p className="mt-2 text-4xl font-black text-fuchsia-400">
                {loading ? "..." : <AnimatedNumber value={stats.new} />}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs font-bold text-amber-300">Contacted</p>
              <p className="mt-2 text-4xl font-black text-amber-400">
                {loading ? "..." : <AnimatedNumber value={stats.contacted} />}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs font-bold text-emerald-300">Converted</p>
              <p className="mt-2 text-4xl font-black text-emerald-400">
                {loading ? "..." : <AnimatedNumber value={stats.won} />}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sheet Status */}
      {sheetStatus && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-bold ${
            sheetStatus.connected
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <Zap
            size={16}
            className={
              sheetStatus.connected ? "text-emerald-500" : "text-amber-500"
            }
          />
          {sheetStatus.connected ? (
            <>
              Google Sheets connected —{" "}
              <span className="font-black">{sheetStatus.leadCount}</span> leads
              in spreadsheet
              <a
                href="https://docs.google.com/spreadsheets/d/1vAankCZMlz64zNa-rXaoHxdshmvhkJza1ubz-i92hUM"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 underline underline-offset-2 hover:text-emerald-900"
              >
                Open Sheet <ExternalLink size={14} />
              </a>
            </>
          ) : (
            <>
              Google Sheets write not configured.{" "}
              <a
                href="/docs/google-apps-script.txt"
                target="_blank"
                className="underline underline-offset-2 hover:text-amber-900"
              >
                Deploy the free Apps Script
              </a>{" "}
              from{" "}
              <code className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs">
                docs/google-apps-script.txt
              </code>{" "}
              and set{" "}
              <code className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs">
                GOOGLE_APPS_SCRIPT_URL
              </code>{" "}
              in .env (no billing, no API keys)
            </>
          )}
        </div>
      )}

      {/* Sync/Import Feedback */}
      {syncMsg && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-bold ${
            syncMsgType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          <Zap size={16} className={syncMsgType === "success" ? "text-emerald-500" : "text-red-500"} />
          {syncMsg}
        </div>
      )}

      {/* Filters */}
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-purple-50 p-3 text-purple-700">
              <Activity size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Lead Stream
                {!loading && (
                  <span className="ml-3 text-sm font-bold text-slate-400">
                    {filtered.length} of {leads.length}
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              <Search size={16} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search leads..."
                className="w-40 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
              <Filter size={16} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none"
              >
                <option value="ALL">All Status</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Leads Grid */}
      <section ref={listRef} className="grid gap-4">
        {loading ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-12 text-center">
            <Loader2 className="mx-auto animate-spin text-slate-300" size={32} />
            <p className="mt-4 text-sm font-bold text-slate-400">
              Loading leads...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-12 text-center">
            <Zap className="mx-auto text-slate-200" size={40} />
            <p className="mt-4 text-lg font-black text-slate-400">
              No leads found
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-400">
              {search
                ? "Try a different search term"
                : "Leads will appear here in realtime as they come in"}
            </p>
          </div>
        ) : (
          filtered.map((lead, index) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              index={index}
              isNew={newLeadId === lead.id}
            />
          ))
        )}
      </section>

      {loading && (
        <div className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl">
          <Loader2 className="animate-spin" size={16} />
          Loading
        </div>
      )}
    </div>
  );
}

function LeadCard({
  lead,
  index,
  isNew,
}: {
  lead: Lead;
  index: number;
  isNew: boolean;
}) {
  const initial = lead.companyName.charAt(0).toUpperCase();
  const sourceKey = Object.keys(SOURCE_GLYPHS).includes(lead.source)
    ? lead.source
    : "OTHER";

  return (
    <div
      className={`group relative rounded-[1.5rem] border bg-white p-5 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl ${
        isNew
          ? "border-fuchsia-300 shadow-fuchsia-100/50 animate-in"
          : "border-slate-200 hover:border-purple-200 hover:shadow-purple-50"
      }`}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {isNew && (
        <div className="absolute -right-2 -top-2 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            New
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white shadow-lg transition-all group-hover:scale-110 ${
              lead.status === "WON"
                ? "bg-gradient-to-br from-emerald-500 to-green-700"
                : lead.status === "LOST"
                  ? "bg-gradient-to-br from-red-500 to-rose-700"
                  : lead.status === "QUALIFIED"
                    ? "bg-gradient-to-br from-emerald-500 to-teal-700"
                    : "bg-gradient-to-br from-purple-600 to-fuchsia-700"
            }`}
          >
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black text-slate-950">
                {lead.companyName}
              </h3>
              <div
                className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[lead.status] || "bg-slate-400"}`}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
              {lead.contactName && (
                <span className="inline-flex items-center gap-1">
                  {lead.contactName}
                </span>
              )}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex items-center gap-1 text-purple-600 hover:underline"
                >
                  {lead.email}
                </a>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-purple-600"
                >
                  {lead.phone}
                </a>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-100 text-[9px] font-black text-slate-500">
                  {SOURCE_GLYPHS[sourceKey]}
                </span>
                {lead.source}
              </span>

              {lead.assignedTo?.user?.name && (
                <span className="inline-flex items-center gap-1">
                  {lead.assignedTo.user.name}
                </span>
              )}

              {lead.estimatedValue && (
                <span className="font-black text-slate-600">
                  ₹{Number(lead.estimatedValue).toLocaleString("en-IN")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span
            className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-sm ${
              STATUS_STYLES[lead.status] || "bg-slate-500"
            }`}
          >
            {STATUS_LABELS[lead.status] || lead.status}
          </span>

          <span className="text-[11px] font-bold text-slate-400">
            {new Date(lead.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default LeadStudioPage;
