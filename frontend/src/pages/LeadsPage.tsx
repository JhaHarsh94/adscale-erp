import { useEffect, useState } from "react";
import { Building2, Mail, Phone, Plus, Search, UserRound } from "lucide-react";
import { apiClient } from "../api/client";
import type { Lead } from "../types/crm";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-700",
  CONTACTED: "bg-yellow-50 text-yellow-700",
  QUALIFIED: "bg-green-50 text-green-700",
  PROPOSAL: "bg-purple-50 text-purple-700",
  NEGOTIATION: "bg-orange-50 text-orange-700",
  WON: "bg-emerald-50 text-emerald-700",
  LOST: "bg-red-50 text-red-700",
  JUNK: "bg-slate-50 text-slate-500",
};

function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ companyName: "", contactName: "", email: "", phone: "", source: "OTHER", notes: "" });

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      const res = await apiClient.get("/crm/leads");
      setLeads(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    await apiClient.post("/crm/leads", form);
    setShowForm(false);
    setForm({ companyName: "", contactName: "", email: "", phone: "", source: "OTHER", notes: "" });
    loadLeads();
  }

  const filtered = leads.filter((l) =>
    `${l.companyName} ${l.contactName} ${l.email || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-950 p-8 text-white shadow-2xl shadow-emerald-100">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-100">CRM</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Lead Management</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
              Track leads, manage follow-ups, and convert prospects into clients.
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/20">
            <p className="text-sm font-bold text-emerald-100">Total Leads</p>
            <p className="mt-2 text-5xl font-black">{loading ? "..." : leads.length}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><Building2 size={24} /></div>
            <div>
              <h2 className="text-xl font-black text-slate-950">All Leads</h2>
              <p className="text-sm font-semibold text-slate-500">Manage your sales pipeline</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700">
            <Plus size={18} /> Add Lead
          </button>
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by company, contact, email..." className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none" />
        </div>
      </section>

      {showForm && (
        <section className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input required placeholder="Company Name" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              <input required placeholder="Contact Name" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              <input placeholder="Email" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input placeholder="Phone" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option value="WEBSITE">Website</option>
                <option value="REFERRAL">Referral</option>
                <option value="COLD_CALL">Cold Call</option>
                <option value="SOCIAL_MEDIA">Social Media</option>
                <option value="EMAIL">Email</option>
                <option value="EXHIBITION">Exhibition</option>
                <option value="PARTNER">Partner</option>
                <option value="OTHER">Other</option>
              </select>
              <input placeholder="Notes" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-400" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white hover:bg-emerald-700">Create Lead</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </section>
      )}

      <section className="grid gap-4">
        {loading ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading leads...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">No leads found.</div>
        ) : (
          filtered.map((lead) => (
            <div key={lead.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-black text-white">{lead.companyName.charAt(0)}</div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">{lead.companyName}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_COLORS[lead.status] || "bg-slate-50 text-slate-600"}`}>{lead.status}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1"><UserRound size={14} />{lead.contactName}</span>
                      {lead.email && <span className="inline-flex items-center gap-1"><Mail size={14} />{lead.email}</span>}
                      {lead.phone && <span className="inline-flex items-center gap-1"><Phone size={14} />{lead.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400">{lead.source} • {lead._count?.followUps || 0} follow-ups</span>
                  {lead.assignedTo && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{lead.assignedTo.user.name}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default LeadsPage;
