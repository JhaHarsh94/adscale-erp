import { useEffect, useState } from "react";
import { MessageSquare, Plus, RefreshCcw, Ticket } from "lucide-react";
import { apiClient } from "../api/client";
import type { Employee } from "../types/employee";
import type { Client } from "../types/crm";
import type { Ticket as TicketType, TicketCategory, TicketDashboard } from "../types/ticket";

const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";

const statusColors: Record<string, string> = { OPEN: "text-yellow-600 bg-yellow-50", ASSIGNED: "text-blue-600 bg-blue-50", IN_PROGRESS: "text-indigo-600 bg-indigo-50", WAITING_ON_CLIENT: "text-purple-600 bg-purple-50", RESOLVED: "text-green-600 bg-green-50", CLOSED: "text-slate-500 bg-slate-100", ESCALATED: "text-red-600 bg-red-50" };
const priorityColors: Record<string, string> = { LOW: "text-slate-500 bg-slate-100", MEDIUM: "text-blue-600 bg-blue-50", HIGH: "text-orange-600 bg-orange-50", URGENT: "text-red-600 bg-red-50" };

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [dashboard, setDashboard] = useState<TicketDashboard | null>(null);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [message, setMessage] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", source: "INTERNAL", categoryId: "", clientId: "", assignedToId: "" });

  async function load() {
    try {
      const [dash, ticketList, catList, empList, clientList] = await Promise.all([
        apiClient.get("/tickets/dashboard"), apiClient.get("/tickets"), apiClient.get("/tickets/categories"), apiClient.get("/employees"), apiClient.get("/crm/clients"),
      ]);
      setDashboard(dash.data.data); setTickets(ticketList.data.data || []); setCategories(catList.data.data || []); setEmployees(empList.data.data || []); setClients(clientList.data.data || []);
    } catch { setMessage("Unable to load tickets"); }
  }
  useEffect(() => { void load(); }, []);

  async function createTicket() {
    try { await apiClient.post("/tickets", form); setMessage("Ticket created"); setShowCreate(false); setForm({ title: "", description: "", priority: "MEDIUM", source: "INTERNAL", categoryId: "", clientId: "", assignedToId: "" }); await load(); }
    catch { setMessage("Title and description are required"); }
  }

  async function changeStatus(id: string, status: string) {
    try { await apiClient.post(`/tickets/${id}/status`, { status }); setMessage("Status updated"); await load(); if (selectedTicket?.id === id) setSelectedTicket(null); }
    catch { setMessage("Failed to update status"); }
  }

  async function assignTicket(id: string, employeeId: string) {
    try { await apiClient.post(`/tickets/${id}/assign`, { employeeId }); setMessage("Ticket assigned"); await load(); }
    catch { setMessage("Failed to assign ticket"); }
  }

  async function addComment() {
    if (!selectedTicket || !commentText.trim()) return;
    try { await apiClient.post(`/tickets/${selectedTicket.id}/comments`, { body: commentText }); setCommentText(""); const res = await apiClient.get(`/tickets/${selectedTicket.id}`); setSelectedTicket(res.data.data); }
    catch { setMessage("Failed to add comment"); }
  }

  const cards = [
    { label: "Open", value: dashboard?.open || 0, color: "text-yellow-600" }, { label: "Assigned", value: dashboard?.assigned || 0, color: "text-blue-600" },
    { label: "In Progress", value: dashboard?.inProgress || 0, color: "text-indigo-600" }, { label: "Waiting", value: dashboard?.waitingOnClient || 0, color: "text-purple-600" },
    { label: "Resolved", value: dashboard?.resolved || 0, color: "text-green-600" }, { label: "Escalated", value: dashboard?.escalated || 0, color: "text-red-600" },
  ];

  return <div className="space-y-6">
    <section className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-8 text-white">
      <div className="flex justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.28em] text-blue-200">Phase 9</p><h1 className="mt-3 text-4xl font-black">Ticket Management</h1><p className="mt-2 text-sm text-blue-100">Support tickets, SLA tracking, comments and escalation.</p></div>
        <button onClick={load} className="h-fit rounded-xl bg-white/10 p-3"><RefreshCcw /></button>
      </div>
    </section>

    {message && <div className="rounded-xl bg-blue-50 p-4 text-sm font-bold text-blue-800">{message}</div>}

    <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => <div key={card.label} className="rounded-2xl border bg-white p-4"><Ticket className={card.color} size={20}/><p className="mt-3 text-xs font-black uppercase text-slate-400">{card.label}</p><p className={`mt-1 text-xl font-black ${card.color}`}>{card.value}</p></div>)}
    </section>

    <section className="rounded-2xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">All Tickets</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"><Plus size={17} />{showCreate ? "Cancel" : "Create Ticket"}</button>
      </div>

      {showCreate && <div className="mt-4 space-y-3"><div className="grid gap-3 md:grid-cols-2">
        <input className={field} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className={field} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p}>{p}</option>)}</select>
        <select className={field} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>{["INTERNAL", "CLIENT"].map((s) => <option key={s}>{s}</option>)}</select>
        <select className={field} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className={field} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}><option value="">Client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className={field} value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}><option value="">Assign to</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name}</option>)}</select>
      </div><textarea className={field} rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button onClick={createTicket} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">Create Ticket</button>
      </div>}

      <div className="mt-5 space-y-3">
        {tickets.length === 0 && <p className="text-center text-sm font-bold text-slate-400">No tickets found</p>}
        {tickets.map((ticket) => <article key={ticket.id} className="rounded-2xl border bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="text-xs font-black text-blue-600">{ticket.ticketNumber}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${statusColors[ticket.status] || ""}`}>{ticket.status}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${priorityColors[ticket.priority] || ""}`}>{ticket.priority}</span>
                {ticket.source === "CLIENT" && <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-black text-purple-600">CLIENT</span>}
              </div>
              <h3 className="mt-2 text-lg font-black">{ticket.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{ticket.description}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-400">
                {ticket.category && <span>{ticket.category.name}</span>}
                {ticket.assignedTo && <span>Assigned: {ticket.assignedTo.user.name}</span>}
                {ticket.client && <span>Client: {ticket.client.name}</span>}
                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)} className="ml-4 rounded-xl border p-2 text-slate-500 hover:bg-slate-50"><MessageSquare size={18} /></button>
          </div>

          {selectedTicket?.id === ticket.id && <div className="mt-5 border-t pt-5">
            <div className="flex flex-wrap gap-2">
              <select className={field + " w-auto"} value={ticket.status} onChange={(e) => changeStatus(ticket.id, e.target.value)}>{["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_ON_CLIENT", "RESOLVED", "CLOSED", "ESCALATED"].map((s) => <option key={s}>{s}</option>)}</select>
              <select className={field + " w-auto"} value={ticket.assignedTo?.id || ""} onChange={(e) => assignTicket(ticket.id, e.target.value)}><option value="">Reassign</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name}</option>)}</select>
            </div>

            <div className="mt-5 space-y-3">
              <h4 className="font-black">Comments ({ticket.comments.length})</h4>
              {ticket.comments.length === 0 && <p className="text-sm text-slate-400">No comments yet</p>}
              {ticket.comments.map((comment) => <div key={comment.id} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">{comment.author?.name || "Unknown"} &middot; {new Date(comment.createdAt).toLocaleString()}</p>
                <p className="mt-1 text-sm font-semibold">{comment.body}</p>
                {comment.isInternal && <span className="mt-1 inline-block rounded bg-yellow-50 px-2 py-0.5 text-xs font-black text-yellow-700">INTERNAL</span>}
              </div>)}
            </div>

            <div className="mt-4 flex gap-2">
              <input className={field} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." onKeyDown={(e) => { if (e.key === "Enter") addComment(); }} />
              <button onClick={addComment} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">Send</button>
            </div>
          </div>}
        </article>)}
      </div>
    </section>
  </div>;
}
