import { useEffect, useState } from "react";
import { Building2, Mail, Phone, Plus, Search } from "lucide-react";
import { apiClient } from "../api/client";
import type { Client } from "../types/crm";

function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", website: "", address: "", industry: "", notes: "", retainerValue: "", contractValue: "" });

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    try {
      const res = await apiClient.get("/crm/clients");
      setClients(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    await apiClient.post("/crm/clients", {
      ...form,
      retainerValue: form.retainerValue || undefined,
      contractValue: form.contractValue || undefined,
    });
    setShowForm(false);
    setForm({ name: "", email: "", phone: "", website: "", address: "", industry: "", notes: "", retainerValue: "", contractValue: "" });
    loadClients();
  }

  const filtered = clients.filter((c) =>
    `${c.name} ${c.email || ""} ${c.industry || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-violet-600 via-violet-700 to-slate-950 p-8 text-white shadow-2xl shadow-violet-100">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-violet-100">CRM</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Client Management</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-violet-50">Manage client companies, contacts, contracts and retainer details.</p>
          </div>
          <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/20">
            <p className="text-sm font-bold text-violet-100">Total Clients</p>
            <p className="mt-2 text-5xl font-black">{loading ? "..." : clients.length}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-violet-50 p-3 text-violet-700"><Building2 size={24} /></div>
            <div><h2 className="text-xl font-black text-slate-950">All Clients</h2><p className="text-sm font-semibold text-slate-500">Client companies and contacts</p></div>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-100 hover:bg-violet-700">
            <Plus size={18} /> Add Client
          </button>
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by company, email, industry..." className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none" />
        </div>
      </section>

      {showForm && (
        <section className="rounded-[1.5rem] border border-violet-200 bg-violet-50 p-5 shadow-sm">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <input required placeholder="Company Name *" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="Email" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input placeholder="Phone" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input placeholder="Website" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              <input placeholder="Industry" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              <input placeholder="Address" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <input placeholder="Retainer Value (₹)" type="number" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400" value={form.retainerValue} onChange={(e) => setForm({ ...form, retainerValue: e.target.value })} />
              <input placeholder="Contract Value (₹)" type="number" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400" value={form.contractValue} onChange={(e) => setForm({ ...form, contractValue: e.target.value })} />
              <input placeholder="Notes" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="rounded-2xl bg-violet-600 px-6 py-3 text-sm font-black text-white hover:bg-violet-700">Create Client</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </form>
        </section>
      )}

      <section className="grid gap-4">
        {loading ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading clients...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">No clients found.</div>
        ) : (
          filtered.map((client) => (
            <div key={client.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-lg font-black text-white">{client.name.charAt(0)}</div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">{client.name}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${client.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-500"}`}>{client.status}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                      {client.email && <span className="inline-flex items-center gap-1"><Mail size={14} />{client.email}</span>}
                      {client.phone && <span className="inline-flex items-center gap-1"><Phone size={14} />{client.phone}</span>}
                      {client.industry && <span className="inline-flex items-center gap-1"><Building2 size={14} />{client.industry}</span>}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[420px] lg:flex-shrink-0">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-black uppercase text-slate-400">Contacts</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{client._count?.contacts || 0}</p>
                  </div>
                  {client.retainerValue && (
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-400">Retainer</p>
                      <p className="mt-1 text-sm font-black text-emerald-600">₹{client.retainerValue}</p>
                    </div>
                  )}
                  {client.contractValue && (
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase text-slate-400">Contract</p>
                      <p className="mt-1 text-sm font-black text-slate-900">₹{client.contractValue}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default ClientsPage;
