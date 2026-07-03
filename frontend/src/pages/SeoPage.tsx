import { useEffect, useState } from "react";
import { Search, TrendingUp, Globe, Hash, Shield, Link2, Plus, Trash2, Save, RefreshCcw, XCircle, BarChart3, ExternalLink, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { apiClient } from "../api/client";
import type { SeoDashboard, SeoProject, SeoKeyword, SeoAudit, SeoBacklink } from "../types/seo";

const f = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";

const tabs = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "projects", label: "Projects", icon: Globe },
  { key: "keywords", label: "Keywords", icon: Hash },
  { key: "audits", label: "Audits", icon: Shield },
  { key: "backlinks", label: "Backlinks", icon: Link2 },
];

function rankColor(pos: number | null) {
  if (!pos) return "text-slate-400";
  if (pos <= 3) return "text-green-600";
  if (pos <= 10) return "text-blue-600";
  if (pos <= 20) return "text-amber-600";
  return "text-red-600";
}

function rankIcon(curr: number | null, prev: number | null) {
  if (curr === null || prev === null) return <Minus size={14} className="text-slate-400" />;
  if (curr < prev) return <ArrowUp size={14} className="text-green-500" />;
  if (curr > prev) return <ArrowDown size={14} className="text-red-500" />;
  return <Minus size={14} className="text-slate-400" />;
}

export default function SeoPage() {
  const [tab, setTab] = useState("dashboard");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // dashboard
  const [dashboard, setDashboard] = useState<SeoDashboard | null>(null);

  // projects
  const [projects, setProjects] = useState<SeoProject[]>([]);
  const [availProjects, setAvailProjects] = useState<{ id: string; name: string }[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState({ projectId: "", domain: "", targetCity: "", targetCountry: "", notes: "" });

  // keywords
  const [keywords, setKeywords] = useState<SeoKeyword[]>([]);
  const [showKwForm, setShowKwForm] = useState(false);
  const [kwForm, setKwForm] = useState({ seoProjectId: "", keyword: "", searchVolume: "", keywordDifficulty: "" });
  const [editKw, setEditKw] = useState<{ id: string; currentPosition: string } | null>(null);

  // audits
  const [audits, setAudits] = useState<SeoAudit[]>([]);
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [auditForm, setAuditForm] = useState({ seoProjectId: "", score: "", totalIssues: "", criticalIssues: "", passedChecks: "", warnings: "", summary: "" });

  // backlinks
  const [backlinks, setBacklinks] = useState<SeoBacklink[]>([]);
  const [showBlForm, setShowBlForm] = useState(false);
  const [blForm, setBlForm] = useState({ seoProjectId: "", sourceUrl: "", targetUrl: "", domainAuthority: "" });

  // suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // filters
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");

  async function fetchSuggestions() {
    if (kwForm.keyword.length < 2) return;
    try {
      const res = await apiClient.get("/seo/keywords/suggest", { params: { q: kwForm.keyword } });
      setSuggestions(res.data.data || []);
    } catch { setMsg("Failed to fetch suggestions"); }
  }

  function msgOk(s: string) { setMsg(s); setTimeout(() => setMsg(""), 3000); }

  async function load() {
    setLoading(true);
    try {
      const [dashRes, projRes] = await Promise.all([
        apiClient.get("/seo/dashboard"),
        apiClient.get("/seo/projects"),
      ]);
      setDashboard(dashRes.data.data);
      setProjects(projRes.data.data || []);
    } catch { setMsg("Failed to load data"); }
    setLoading(false);
  }

  async function loadAvailProjects() {
    try {
      const res = await apiClient.get("/seo/projects/without-seo");
      setAvailProjects(res.data.data || []);
    } catch { /* ignore */ }
  }

  async function loadKeywords(sp?: string) {
    try {
      const params: Record<string, string> = {};
      if (sp) params.seoProjectId = sp;
      const res = await apiClient.get("/seo/keywords", { params });
      setKeywords(res.data.data || []);
    } catch { /* ignore */ }
  }

  async function loadAudits(sp?: string) {
    try {
      const params: Record<string, string> = {};
      if (sp) params.seoProjectId = sp;
      const res = await apiClient.get("/seo/audits", { params });
      setAudits(res.data.data || []);
    } catch { /* ignore */ }
  }

  async function loadBacklinks(sp?: string) {
    try {
      const params: Record<string, string> = {};
      if (sp) params.seoProjectId = sp;
      const res = await apiClient.get("/seo/backlinks", { params });
      setBacklinks(res.data.data || []);
    } catch { /* ignore */ }
  }

  useEffect(() => { if (tab === "dashboard") load(); }, [tab]);
  useEffect(() => { if (tab === "keywords") loadKeywords(filterProject); }, [tab, filterProject]);
  useEffect(() => { if (tab === "audits") loadAudits(filterProject); }, [tab, filterProject]);
  useEffect(() => { if (tab === "backlinks") loadBacklinks(filterProject); }, [tab, filterProject]);
  useEffect(() => { if (tab === "projects") loadAvailProjects(); }, [tab]);

  /* Project CRUD */
  async function createProject() {
    if (!projectForm.projectId || !projectForm.domain) { setMsg("Project and domain required"); return; }
    try {
      await apiClient.post("/seo/projects", projectForm);
      msgOk("SEO project created"); setShowProjectForm(false);
      setProjectForm({ projectId: "", domain: "", targetCity: "", targetCountry: "", notes: "" });
      load(); loadAvailProjects();
    } catch { setMsg("Failed"); }
  }

  async function deleteProject(id: string) {
    try { await apiClient.delete(`/seo/projects/${id}`); msgOk("Deleted"); load(); } catch { setMsg("Failed"); }
  }

  /* Keyword CRUD */
  async function createKeyword() {
    if (!kwForm.seoProjectId || !kwForm.keyword) { setMsg("Project and keyword required"); return; }
    try {
      await apiClient.post("/seo/keywords", kwForm);
      msgOk("Keyword added"); setShowKwForm(false);
      setKwForm({ seoProjectId: "", keyword: "", searchVolume: "", keywordDifficulty: "" });
      loadKeywords(filterProject);
    } catch { setMsg("Failed"); }
  }

  async function updateKeywordRank(id: string) {
    if (!editKw) return;
    try {
      await apiClient.put(`/seo/keywords/${id}`, { currentPosition: editKw.currentPosition });
      msgOk("Rank updated"); setEditKw(null); loadKeywords(filterProject);
    } catch { setMsg("Failed"); }
  }

  async function deleteKeyword(id: string) {
    try { await apiClient.delete(`/seo/keywords/${id}`); msgOk("Deleted"); loadKeywords(filterProject); } catch { setMsg("Failed"); }
  }

  /* Audit CRUD */
  async function createAudit() {
    if (!auditForm.seoProjectId) { setMsg("Project required"); return; }
    try {
      await apiClient.post("/seo/audits", auditForm);
      msgOk("Audit created"); setShowAuditForm(false);
      setAuditForm({ seoProjectId: "", score: "", totalIssues: "", criticalIssues: "", passedChecks: "", warnings: "", summary: "" });
      loadAudits(filterProject);
    } catch { setMsg("Failed"); }
  }

  async function deleteAudit(id: string) {
    try { await apiClient.delete(`/seo/audits/${id}`); msgOk("Deleted"); loadAudits(filterProject); } catch { setMsg("Failed"); }
  }

  /* Backlink CRUD */
  async function createBacklink() {
    if (!blForm.seoProjectId || !blForm.sourceUrl) { setMsg("Project and source URL required"); return; }
    try {
      await apiClient.post("/seo/backlinks", blForm);
      msgOk("Backlink added"); setShowBlForm(false);
      setBlForm({ seoProjectId: "", sourceUrl: "", targetUrl: "", domainAuthority: "" });
      loadBacklinks(filterProject);
    } catch { setMsg("Failed"); }
  }

  async function deleteBacklink(id: string) {
    try { await apiClient.delete(`/seo/backlinks/${id}`); msgOk("Deleted"); loadBacklinks(filterProject); } catch { setMsg("Failed"); }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-6 md:p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.28em] text-blue-200">Phase 22</p>
            <h1 className="mt-3 text-2xl md:text-4xl font-black">SEO Management</h1>
            <p className="mt-2 text-xs md:text-sm text-blue-100">Keyword rankings, audits, backlinks & competitor tracking.</p>
          </div>
          <button onClick={load} className="rounded-xl bg-white/10 p-2.5 md:p-3"><RefreshCcw size={18} /></button>
        </div>
      </section>

      {msg && (
        <div className="rounded-xl bg-blue-50 p-3 md:p-4 text-xs md:text-sm font-bold text-blue-800 flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg("")} className="text-blue-400 hover:text-blue-700"><XCircle size={16} /></button>
        </div>
      )}

      {/* Tabs */}
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

      {/* ───── Dashboard ───── */}
      {tab === "dashboard" && loading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      )}
      {tab === "dashboard" && !loading && dashboard && (
        <div className="space-y-6">
          <div className="grid gap-3 md:gap-4 grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Projects", value: dashboard.totalProjects, icon: Globe },
              { label: "Keywords", value: dashboard.totalKeywords, icon: Hash },
              { label: "Avg. Rank", value: `#${dashboard.avgPosition}`, icon: TrendingUp },
              { label: "Best Rank", value: dashboard.bestPosition ? `#${dashboard.bestPosition}` : "—", icon: ArrowUp },
              { label: "Audits", value: dashboard.totalAudits, icon: Shield },
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

          {/* Recent Audits */}
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="font-black text-slate-900 mb-3">Recent Audits</h3>
            {dashboard.recentAudits.length === 0 ? (
              <p className="text-sm text-slate-400">No audits yet</p>
            ) : (
              <div className="space-y-2">
                {dashboard.recentAudits.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{a.seoProject?.domain || "—"}</p>
                      <p className="text-xs text-slate-500">{a.performedBy?.name} &middot; {new Date(a.performedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.score !== null && (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${a.score >= 80 ? "bg-green-50 text-green-700" : a.score >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                          {a.score}/100
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───── Projects ───── */}
      {tab === "projects" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-500">{projects.length} SEO project(s)</p>
            <button onClick={() => { setShowProjectForm(!showProjectForm); if (!showProjectForm) loadAvailProjects(); }} className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white"><Plus size={16} />New Project</button>
          </div>
          {showProjectForm && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <h3 className="font-black text-blue-800">Link Project for SEO</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <select className={f} value={projectForm.projectId} onChange={(e) => setProjectForm({ ...projectForm, projectId: e.target.value })}>
                  <option value="">Select project *</option>
                  {availProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input className={f} placeholder="Domain (e.g. example.com) *" value={projectForm.domain} onChange={(e) => setProjectForm({ ...projectForm, domain: e.target.value })} />
                <input className={f} placeholder="Target city" value={projectForm.targetCity} onChange={(e) => setProjectForm({ ...projectForm, targetCity: e.target.value })} />
                <input className={f} placeholder="Target country" value={projectForm.targetCountry} onChange={(e) => setProjectForm({ ...projectForm, targetCountry: e.target.value })} />
                <textarea className={`${f} md:col-span-2 min-h-[60px]`} placeholder="Notes" value={projectForm.notes} onChange={(e) => setProjectForm({ ...projectForm, notes: e.target.value })} />
              </div>
              <button onClick={createProject} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white"><Save size={16} className="inline mr-1" />Create</button>
            </div>
          )}
          {projects.map((p) => (
            <div key={p.id} className="rounded-2xl border bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-blue-500" />
                    <a href={`https://${p.domain}`} target="_blank" rel="noopener noreferrer" className="font-black text-blue-700 hover:underline">{p.domain}</a>
                    <ExternalLink size={12} className="text-slate-400" />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{p.project.name} — {p.project.client.name}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-slate-400">
                    <span>{p._count.keywords} keywords</span>
                    <span>{p._count.audits} audits</span>
                    <span>{p._count.backlinks} backlinks</span>
                    {p.targetCity && <span>📍 {p.targetCity}</span>}
                    {p.targetCountry && <span>🌍 {p.targetCountry}</span>}
                  </div>
                </div>
                <button onClick={() => deleteProject(p.id)} className="rounded-xl bg-red-50 p-2 text-red-500 hover:bg-red-100"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {projects.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No SEO projects yet</p>}
        </div>
      )}

      {/* ───── Keywords ───── */}
      {tab === "keywords" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 flex-1 max-w-xs">
              <Search size={14} className="text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search keywords..." className="w-full bg-transparent text-xs font-semibold text-slate-900 outline-none" />
            </div>
            <select className={f + " max-w-[200px]"} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
              <option value="">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.domain}</option>)}
            </select>
            <button onClick={() => setShowKwForm(!showKwForm)} className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white"><Plus size={16} />Add Keyword</button>
          </div>
          {showKwForm && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <h3 className="font-black text-blue-800">Track New Keyword</h3>
              <div className="grid gap-3 md:grid-cols-4">
                <select className={f} value={kwForm.seoProjectId} onChange={(e) => setKwForm({ ...kwForm, seoProjectId: e.target.value })}>
                  <option value="">Select project *</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.domain}</option>)}
                </select>
                <div className="relative">
                  <input className={f + " pr-20"} placeholder="Keyword *" value={kwForm.keyword} onChange={(e) => { setKwForm({ ...kwForm, keyword: e.target.value }); setSuggestions([]); }} />
                  <button type="button" onClick={fetchSuggestions} disabled={kwForm.keyword.length < 2} className="absolute right-1 top-1 rounded-lg bg-blue-100 px-2.5 py-1.5 text-[10px] font-black text-blue-700 hover:bg-blue-200 disabled:opacity-40">Suggest</button>
                </div>
                <input className={f} type="number" placeholder="Search volume" value={kwForm.searchVolume} onChange={(e) => setKwForm({ ...kwForm, searchVolume: e.target.value })} />
                <input className={f} type="number" placeholder="Difficulty (0-100)" value={kwForm.keywordDifficulty} onChange={(e) => setKwForm({ ...kwForm, keywordDifficulty: e.target.value })} />
              </div>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => { setKwForm({ ...kwForm, keyword: s }); setSuggestions([]); }} className="rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition">{s}</button>
                  ))}
                </div>
              )}
              <button onClick={createKeyword} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white"><Save size={16} className="inline mr-1" />Add</button>
            </div>
          )}
          {keywords.length === 0 ? (
            <p className="py-8 text-center text-sm font-bold text-slate-400">No keywords tracked</p>
          ) : (
            <div className="space-y-2">
              {keywords.filter((k) => !search || k.keyword.toLowerCase().includes(search.toLowerCase())).map((k) => (
                <div key={k.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Hash size={14} className="text-slate-400 shrink-0" />
                        <span className="text-sm font-black text-slate-900">{k.keyword}</span>
                        <span className="text-[10px] text-slate-400">{k.seoProject?.domain}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-semibold text-slate-400">
                        {k.searchVolume && <span>🔍 {k.searchVolume.toLocaleString()}/mo</span>}
                        {k.keywordDifficulty !== null && <span>Difficulty: {k.keywordDifficulty}%</span>}
                        <span>Tracked: {new Date(k.trackedSince).toLocaleDateString()}</span>
                        {k.lastChecked && <span>Last check: {new Date(k.lastChecked).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className={`text-2xl font-black ${rankColor(k.currentPosition)}`}>
                          {k.currentPosition ? `#${k.currentPosition}` : "—"}
                        </p>
                        <div className="flex items-center gap-1 justify-end">
                          {rankIcon(k.currentPosition, k.previousPosition)}
                          <span className="text-[10px] text-slate-400">
                            {k.previousPosition ? `#${k.previousPosition}` : "new"}
                          </span>
                          {k.bestPosition && <span className="text-[10px] text-green-600 ml-1">best: #{k.bestPosition}</span>}
                        </div>
                      </div>
                      {editKw?.id === k.id ? (
                        <div className="flex items-center gap-2">
                          <input className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-center" type="number" value={editKw.currentPosition} onChange={(e) => setEditKw({ ...editKw, currentPosition: e.target.value })} />
                          <button onClick={() => updateKeywordRank(k.id)} className="rounded-lg bg-green-500 p-1.5 text-white"><Save size={14} /></button>
                          <button onClick={() => setEditKw(null)} className="rounded-lg bg-slate-200 p-1.5"><XCircle size={14} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setEditKw({ id: k.id, currentPosition: String(k.currentPosition || "") })} className="rounded-lg bg-blue-50 p-1.5 text-blue-600 hover:bg-blue-100"><TrendingUp size={14} /></button>
                      )}
                      <button onClick={() => deleteKeyword(k.id)} className="rounded-lg bg-red-50 p-1.5 text-red-500 hover:bg-red-100"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───── Audits ───── */}
      {tab === "audits" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <select className={f + " max-w-[200px]"} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
              <option value="">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.domain}</option>)}
            </select>
            <button onClick={() => setShowAuditForm(!showAuditForm)} className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white"><Plus size={16} />New Audit</button>
          </div>
          {showAuditForm && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <h3 className="font-black text-blue-800">Log SEO Audit</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <select className={f} value={auditForm.seoProjectId} onChange={(e) => setAuditForm({ ...auditForm, seoProjectId: e.target.value })}>
                  <option value="">Select project *</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.domain}</option>)}
                </select>
                <input className={f} type="number" placeholder="Score (0-100)" value={auditForm.score} onChange={(e) => setAuditForm({ ...auditForm, score: e.target.value })} />
                <input className={f} type="number" placeholder="Total issues" value={auditForm.totalIssues} onChange={(e) => setAuditForm({ ...auditForm, totalIssues: e.target.value })} />
                <input className={f} type="number" placeholder="Critical issues" value={auditForm.criticalIssues} onChange={(e) => setAuditForm({ ...auditForm, criticalIssues: e.target.value })} />
                <input className={f} type="number" placeholder="Passed checks" value={auditForm.passedChecks} onChange={(e) => setAuditForm({ ...auditForm, passedChecks: e.target.value })} />
                <input className={f} type="number" placeholder="Warnings" value={auditForm.warnings} onChange={(e) => setAuditForm({ ...auditForm, warnings: e.target.value })} />
                <textarea className={`${f} md:col-span-3 min-h-[60px]`} placeholder="Summary" value={auditForm.summary} onChange={(e) => setAuditForm({ ...auditForm, summary: e.target.value })} />
              </div>
              <button onClick={createAudit} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white"><Save size={16} className="inline mr-1" />Save</button>
            </div>
          )}
          {audits.length === 0 ? (
            <p className="py-8 text-center text-sm font-bold text-slate-400">No audits recorded</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Issues</th>
                    <th className="px-4 py-3">Critical</th>
                    <th className="px-4 py-3">Passed</th>
                    <th className="px-4 py-3">Performed By</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs font-semibold text-slate-700">
                  {audits.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold">{a.seoProject?.domain || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${a.score !== null && a.score >= 80 ? "bg-green-50 text-green-700" : a.score !== null && a.score >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                          {a.score !== null ? `${a.score}/100` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{a.totalIssues ?? "—"}</td>
                      <td className="px-4 py-3">
                        {a.criticalIssues ? <span className="text-red-600 font-black">{a.criticalIssues}</span> : "—"}
                      </td>
                      <td className="px-4 py-3">{a.passedChecks ?? "—"}</td>
                      <td className="px-4 py-3">{a.performedBy?.name || "—"}</td>
                      <td className="px-4 py-3">{new Date(a.performedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteAudit(a.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ───── Backlinks ───── */}
      {tab === "backlinks" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <select className={f + " max-w-[200px]"} value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
              <option value="">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.domain}</option>)}
            </select>
            <button onClick={() => setShowBlForm(!showBlForm)} className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white"><Plus size={16} />Add Backlink</button>
          </div>
          {showBlForm && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <h3 className="font-black text-blue-800">Track Backlink</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <select className={f} value={blForm.seoProjectId} onChange={(e) => setBlForm({ ...blForm, seoProjectId: e.target.value })}>
                  <option value="">Select project *</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.domain}</option>)}
                </select>
                <input className={f} placeholder="Source URL *" value={blForm.sourceUrl} onChange={(e) => setBlForm({ ...blForm, sourceUrl: e.target.value })} />
                <input className={f} placeholder="Target URL" value={blForm.targetUrl} onChange={(e) => setBlForm({ ...blForm, targetUrl: e.target.value })} />
                <input className={f} type="number" placeholder="Domain Authority (0-100)" value={blForm.domainAuthority} onChange={(e) => setBlForm({ ...blForm, domainAuthority: e.target.value })} />
              </div>
              <button onClick={createBacklink} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white"><Save size={16} className="inline mr-1" />Add</button>
            </div>
          )}
          {backlinks.length === 0 ? (
            <p className="py-8 text-center text-sm font-bold text-slate-400">No backlinks tracked</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Source URL</th>
                    <th className="px-4 py-3">DA</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Discovered</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs font-semibold text-slate-700">
                  {backlinks.map((bl) => (
                    <tr key={bl.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold">{bl.seoProject?.domain || "—"}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate">
                        <a href={bl.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          {bl.sourceUrl} <ExternalLink size={10} />
                        </a>
                      </td>
                      <td className="px-4 py-3">{bl.domainAuthority ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${bl.isFollow ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                          {bl.isFollow ? "DoFollow" : "NoFollow"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${bl.status === "ACTIVE" ? "bg-green-50 text-green-700" : bl.status === "LOST" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                          {bl.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{new Date(bl.discoveredAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteBacklink(bl.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
