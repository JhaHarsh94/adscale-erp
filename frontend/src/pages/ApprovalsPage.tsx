import { useEffect, useState } from "react";
import { Plus, RefreshCcw, ThumbsUp, ThumbsDown, Trash2, XCircle, MessageSquare, RotateCcw, Send } from "lucide-react";
import { apiClient } from "../api/client";
import type { Employee } from "../types/employee";
import type { Approval, ApprovalDashboard } from "../types/approval";

const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";
const userJson = localStorage.getItem("adscale_user");
const currentUser = userJson ? JSON.parse(userJson) : null;
const isAgent = ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER", "TEAM_LEAD"].includes(currentUser?.role?.name || "");

const typeLabels: Record<string, string> = { DESIGN: "Design", VIDEO: "Video", WEBSITE: "Website", CONTENT: "Content", REPORT: "Report", CAMPAIGN: "Campaign", PROPOSAL: "Proposal", OTHER: "Other" };
const typeColors: Record<string, string> = { DESIGN: "bg-purple-100 text-purple-700", VIDEO: "bg-pink-100 text-pink-700", WEBSITE: "bg-blue-100 text-blue-700", CONTENT: "bg-amber-100 text-amber-700", REPORT: "bg-cyan-100 text-cyan-700", CAMPAIGN: "bg-orange-100 text-orange-700", PROPOSAL: "bg-indigo-100 text-indigo-700", OTHER: "bg-slate-100 text-slate-600" };
const statusLabels: Record<string, string> = { PENDING: "Pending", IN_REVIEW: "In Review", APPROVED: "Approved", REVISIONS_REQUESTED: "Revisions", REJECTED: "Rejected", CANCELLED: "Cancelled" };
const statusBadge: Record<string, string> = { PENDING: "bg-amber-50 text-amber-700", IN_REVIEW: "bg-blue-50 text-blue-700", APPROVED: "bg-green-50 text-green-700", REVISIONS_REQUESTED: "bg-orange-50 text-orange-700", REJECTED: "bg-red-50 text-red-700", CANCELLED: "bg-slate-100 text-slate-500" };
const stepStatusIcon: Record<string, string> = { PENDING: "text-slate-300", APPROVED: "text-green-500", REJECTED: "text-red-500", SKIPPED: "text-slate-300" };

export default function ApprovalsPage() {
  const [dashboard, setDashboard] = useState<ApprovalDashboard | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [pendingReview, setPendingReview] = useState<Approval[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"my" | "pending" | "all">("my");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Approval | null>(null);
  const [commentText, setCommentText] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState({ title: "", description: "", type: "DESIGN", priority: "MEDIUM", steps: [{ reviewerId: "", stepOrder: 1 }] as { reviewerId: string; stepOrder: number }[] });

  async function load() {
    try {
      const [dash, empList] = await Promise.all([
        apiClient.get("/approvals/dashboard"),
        apiClient.get("/employees"),
      ]);
      setDashboard(dash.data.data);
      setEmployees(empList.data.data || []);
    } catch { setMessage("Unable to load approvals"); }
  }

  async function loadMy() {
    try { const res = await apiClient.get("/approvals"); setApprovals(res.data.data || []); } catch {}
  }

  async function loadPendingReview() {
    try { const res = await apiClient.get("/approvals/pending-review"); setPendingReview(res.data.data || []); } catch {}
  }

  async function loadAll() {
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      const res = await apiClient.get("/approvals", { params });
      setApprovals(res.data.data || []);
    } catch {}
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (view === "my") loadMy(); }, [view]);
  useEffect(() => { if (view === "pending") loadPendingReview(); }, [view]);
  useEffect(() => { if (view === "all") loadAll(); }, [view]);

  async function createApproval() {
    try {
      if (!form.title.trim()) { setMessage("Title is required"); return; }
      const steps = form.steps.filter((s) => s.reviewerId);
      await apiClient.post("/approvals", { ...form, steps: steps.length > 0 ? steps : undefined });
      setMessage("Approval request created");
      setShowCreate(false);
      setForm({ title: "", description: "", type: "DESIGN", priority: "MEDIUM", steps: [{ reviewerId: "", stepOrder: 1 }] });
      await loadMy();
    } catch { setMessage("Failed to create approval request"); }
  }

  async function deleteApproval(id: string) {
    try { await apiClient.delete(`/approvals/${id}`); setMessage("Approval deleted"); await loadMy(); } catch { setMessage("Failed to delete"); }
  }

  async function cancelApproval(id: string) {
    try { await apiClient.post(`/approvals/${id}/cancel`); setMessage("Approval cancelled"); await loadMy(); if (view === "pending") loadPendingReview(); } catch { setMessage("Failed to cancel"); }
  }

  async function actOnStep(stepId: string, action: "APPROVED" | "REJECTED", approvalId: string) {
    try {
      await apiClient.post(`/approvals/${approvalId}/steps/${stepId}/act`, { action });
      setMessage(`Step ${action === "APPROVED" ? "approved" : "rejected"}`);
      await loadPendingReview();
      if (selected?.id === approvalId) { const res = await apiClient.get(`/approvals/${approvalId}`); setSelected(res.data.data); }
    } catch { setMessage("Failed to act on step"); }
  }

  async function requestRevisions(id: string) {
    try { await apiClient.post(`/approvals/${id}/revisions`); setMessage("Revisions requested"); await loadMy(); } catch { setMessage("Failed"); }
  }

  async function resubmit(id: string) {
    try { await apiClient.post(`/approvals/${id}/resubmit`); setMessage("Resubmitted"); await loadMy(); } catch { setMessage("Failed"); }
  }

  async function addComment() {
    if (!selected || !commentText.trim()) return;
    try {
      await apiClient.post(`/approvals/${selected.id}/comments`, { body: commentText });
      setCommentText("");
      const res = await apiClient.get(`/approvals/${selected.id}`);
      setSelected(res.data.data);
    } catch { setMessage("Failed to add comment"); }
  }

  function addStepRow() {
    setForm({ ...form, steps: [...form.steps, { reviewerId: "", stepOrder: form.steps.length + 1 }] });
  }

  function updateStep(index: number, reviewerId: string) {
    const steps = [...form.steps];
    steps[index] = { ...steps[index], reviewerId };
    setForm({ ...form, steps });
  }

  function removeStep(index: number) {
    const steps = form.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setForm({ ...form, steps });
  }

  const cards = [
    { label: "Total Requests", value: dashboard?.total || 0 },
    { label: "Pending", value: dashboard?.pending || 0 },
    { label: "In Review", value: dashboard?.inReview || 0 },
    { label: "Approved", value: dashboard?.approved || 0 },
    { label: "My Requests", value: dashboard?.myRequests || 0 },
    { label: "My Review", value: dashboard?.pendingMyReview || 0 },
  ];

  function ApprovalCard({ item }: { item: Approval }) {
    return (
      <div className="rounded-2xl border bg-white p-5 transition hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${typeColors[item.type] || ""}`}>{typeLabels[item.type]}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${statusBadge[item.status] || ""}`}>{statusLabels[item.status]}</span>
              <span className="text-xs font-bold text-slate-400">{item.priority}</span>
            </div>
            <h3 className="mt-2 text-lg font-black">{item.title}</h3>
            {item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}
            <div className="mt-3 flex items-center gap-4 text-xs font-bold text-slate-400">
              <span>By: {item.createdBy?.name || "Unknown"}</span>
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              <span>{item.steps.length} step(s)</span>
              <span>{item.comments.length} comment(s)</span>
            </div>

            {item.steps.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                {item.steps.map((step, idx) => (
                  <div key={step.id} className="flex items-center gap-1">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${step.status === "APPROVED" ? "bg-green-100 text-green-700" : step.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-400"}`}>
                      {step.status === "APPROVED" ? "Y" : step.status === "REJECTED" ? "N" : idx + 1}
                    </span>
                    {idx < item.steps.length - 1 && <span className="text-slate-300">—</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => setSelected(selected?.id === item.id ? null : item)} className="rounded-lg border p-1.5 text-slate-400 hover:bg-slate-50"><MessageSquare size={15} /></button>
            {(item.status === "PENDING" || item.status === "IN_REVIEW") && isAgent && (
              <button onClick={() => cancelApproval(item.id)} className="rounded-lg border p-1.5 text-slate-400 hover:bg-orange-50 hover:text-orange-600"><XCircle size={15} /></button>
            )}
            {(item.status === "PENDING" || item.status === "CANCELLED") && ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(currentUser?.role?.name || "") && (
              <button onClick={() => deleteApproval(item.id)} className="rounded-lg border p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
            )}
            {item.status === "REVISIONS_REQUESTED" && (
              <button onClick={() => resubmit(item.id)} className="rounded-lg border p-1.5 text-blue-500 hover:bg-blue-50"><RotateCcw size={15} /></button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.28em] text-blue-200">Phase 12</p>
            <h1 className="mt-3 text-4xl font-black">Approval Management</h1>
            <p className="mt-2 text-sm text-blue-100">Multi-step approval workflow for designs, videos, content, reports and more.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex rounded-xl bg-white/10">
              {(["my", "pending", "all"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-4 py-2 text-sm font-black transition ${view === v ? "bg-white text-blue-800" : "text-blue-100 hover:text-white"}`}>
                  {v === "my" ? "My Requests" : v === "pending" ? "Pending My Review" : "All"}
                </button>
              ))}
            </div>
            <button onClick={() => { load(); if (view === "my") loadMy(); if (view === "pending") loadPendingReview(); if (view === "all") loadAll(); }} className="rounded-xl bg-white/10 p-3"><RefreshCcw size={18} /></button>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl bg-blue-50 p-4 text-sm font-bold text-blue-800">
          {message}
          <button onClick={() => setMessage("")} className="ml-3 text-blue-400 hover:text-blue-700"><XCircle size={16} className="inline" /></button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border bg-white p-4">
            <p className="text-xs font-black uppercase text-slate-400">{card.label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border bg-white p-6">
        {view === "my" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">My Approval Requests</h2>
              <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">
                <Plus size={17} />{showCreate ? "Cancel" : "New Request"}
              </button>
            </div>

            {showCreate && (
              <div className="mt-4 space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <h3 className="font-black text-blue-800">Create Approval Request</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className={field} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select className={field} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p}>{p}</option>)}
                  </select>
                  <input className={field} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-black text-blue-800">Approval Steps (reviewers)</p>
                  {form.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-600 w-6">#{idx + 1}</span>
                      <select className={field + " flex-1"} value={step.reviewerId} onChange={(e) => updateStep(idx, e.target.value)}>
                        <option value="">Select reviewer</option>
                        {employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name} ({e.employeeCode})</option>)}
                      </select>
                      {form.steps.length > 1 && <button onClick={() => removeStep(idx)} className="text-xs font-black text-red-500 hover:text-red-700">Remove</button>}
                    </div>
                  ))}
                  <button onClick={addStepRow} className="text-sm font-bold text-blue-600 hover:text-blue-800">+ Add step</button>
                </div>

                <button onClick={createApproval} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white">Submit</button>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {approvals.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No approval requests yet.</p>}
              {approvals.map((item) => <ApprovalCard key={item.id} item={item} />)}
            </div>
          </>
        )}

        {view === "pending" && (
          <>
            <h2 className="text-xl font-black">Pending My Review</h2>
            <div className="mt-5 space-y-3">
              {pendingReview.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No pending reviews.</p>}
              {pendingReview.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-white p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${typeColors[item.type] || ""}`}>{typeLabels[item.type]}</span>
                        <span className="text-xs font-bold text-slate-400">{item.priority}</span>
                      </div>
                      <h3 className="mt-1 text-lg font-black">{item.title}</h3>
                      {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
                      <p className="mt-2 text-xs font-bold text-slate-400">By {item.createdBy?.name} &middot; {new Date(item.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { const step = item.steps.find((s) => s.status === "PENDING"); if (step) actOnStep(step.id, "APPROVED", item.id); }} className="flex items-center gap-1.5 rounded-xl bg-green-50 px-4 py-2 text-sm font-black text-green-700 hover:bg-green-100"><ThumbsUp size={16} />Approve</button>
                      <button onClick={() => { const step = item.steps.find((s) => s.status === "PENDING"); if (step) actOnStep(step.id, "REJECTED", item.id); }} className="flex items-center gap-1.5 rounded-xl bg-red-50 px-4 py-2 text-sm font-black text-red-700 hover:bg-red-100"><ThumbsDown size={16} />Reject</button>
                      <button onClick={() => requestRevisions(item.id)} className="rounded-xl border px-4 py-2 text-sm font-black text-orange-600 hover:bg-orange-50"><RotateCcw size={16} className="inline mr-1" />Revise</button>
                      <button onClick={() => setSelected(selected?.id === item.id ? null : item)} className="rounded-lg border p-2 text-slate-400 hover:bg-slate-50"><MessageSquare size={15} /></button>
                    </div>
                  </div>

                  {item.steps.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 border-t pt-3">
                      {item.steps.map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-1 text-xs font-bold">
                          <span className={`flex h-5 w-5 items-center justify-center rounded-full ${step.status === "APPROVED" ? "bg-green-100 text-green-700" : step.status === "REJECTED" ? "bg-red-100 text-red-700" : step.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>
                            {step.status === "APPROVED" ? "Y" : step.status === "REJECTED" ? "N" : idx + 1}
                          </span>
                          <span className="text-slate-500">{step.reviewer?.user?.name || "Unassigned"}</span>
                          {idx < item.steps.length - 1 && <span className="text-slate-300 mx-1">→</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {view === "all" && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">All Approvals</h2>
              <div className="flex gap-2">
                <select className={field + " w-40"} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All statuses</option>
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={loadAll} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">Filter</button>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {approvals.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No approvals found.</p>}
              {approvals.map((item) => <ApprovalCard key={item.id} item={item} />)}
            </div>
          </>
        )}

        {/* Detail panel */}
        {selected && (
          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-blue-900">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="rounded-lg border bg-white p-1.5 text-sm text-slate-400"><XCircle size={16} /></button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {selected.steps.map((step) => (
                <div key={step.id} className={`rounded-xl border bg-white p-4 ${step.status === "PENDING" ? "border-amber-200" : step.status === "APPROVED" ? "border-green-200" : step.status === "REJECTED" ? "border-red-200" : ""}`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-500">Step #{step.stepOrder}</p>
                    <span className={`text-xs font-black ${stepStatusIcon[step.status]}`}>{step.status}</span>
                  </div>
                  <p className="mt-1 text-sm font-bold">{step.reviewer?.user?.name || "Unassigned"}</p>
                  {step.comments && <p className="mt-1 text-xs text-slate-500">{step.comments}</p>}
                  {step.actedAt && <p className="mt-1 text-xs text-slate-400">{new Date(step.actedAt).toLocaleString()}</p>}
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              <h4 className="font-black text-blue-900">Comments ({selected.comments.length})</h4>
              {selected.comments.length === 0 && <p className="text-sm text-slate-400">No comments yet</p>}
              {selected.comments.map((c) => (
                <div key={c.id} className="rounded-xl bg-white p-4">
                  <p className="text-xs font-bold text-slate-400">{c.user?.name || "Unknown"} &middot; {new Date(c.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-sm font-semibold">{c.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <input className={field} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." onKeyDown={(e) => { if (e.key === "Enter") addComment(); }} />
              <button onClick={addComment} className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"><Send size={16} />Send</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
