import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Plus, RefreshCcw, Trash2 } from "lucide-react";
import { apiClient } from "../api/client";
import type { Employee } from "../types/employee";
import type { Project } from "../types/project";
import type { Task, TaskDashboard, TaskKanban } from "../types/task";

const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";

const statusLabels: Record<string, string> = { BACKLOG: "Backlog", TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "In Review", DONE: "Done", CANCELLED: "Cancelled" };
const statusColors: Record<string, string> = { BACKLOG: "border-t-slate-300", TODO: "border-t-blue-400", IN_PROGRESS: "border-t-indigo-500", IN_REVIEW: "border-t-amber-400", DONE: "border-t-green-500", CANCELLED: "border-t-red-400" };
const statusBadge: Record<string, string> = { BACKLOG: "bg-slate-100 text-slate-600", TODO: "bg-blue-50 text-blue-700", IN_PROGRESS: "bg-indigo-50 text-indigo-700", IN_REVIEW: "bg-amber-50 text-amber-700", DONE: "bg-green-50 text-green-700", CANCELLED: "bg-red-50 text-red-700" };
const priorityBadge: Record<string, string> = { LOW: "bg-slate-100 text-slate-500", MEDIUM: "bg-blue-50 text-blue-600", HIGH: "bg-orange-50 text-orange-600", URGENT: "bg-red-50 text-red-600" };
const columns = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"];

export default function TasksPage() {
  const [kanban, setKanban] = useState<TaskKanban | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dashboard, setDashboard] = useState<TaskDashboard | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", projectId: "", assignedToId: "", estimatedHrs: "" });

  async function load() {
    try {
      const [dash, board, empList, projList] = await Promise.all([
        apiClient.get("/tasks/dashboard"), apiClient.get("/tasks/kanban"), apiClient.get("/employees"), apiClient.get("/projects"),
      ]);
      setDashboard(dash.data.data); setKanban(board.data.data); setEmployees(empList.data.data || []); setProjects(projList.data.data || []);
    } catch { setMessage("Unable to load tasks"); }
  }
  useEffect(() => { void load(); }, []);

  async function loadList() {
    try { const res = await apiClient.get("/tasks"); setTasks(res.data.data || []); } catch { setMessage("Unable to load tasks"); }
  }
  useEffect(() => { if (view === "list") loadList(); }, [view]);

  async function createTask() {
    try { await apiClient.post("/tasks", form); setMessage("Task created"); setShowCreate(false); setForm({ title: "", description: "", priority: "MEDIUM", projectId: "", assignedToId: "", estimatedHrs: "" }); await load(); }
    catch { setMessage("Title is required"); }
  }

  async function changeStatus(id: string, status: string) {
    try { await apiClient.post(`/tasks/${id}/status`, { status }); setMessage("Status updated"); await load(); if (view === "list") await loadList(); }
    catch { setMessage("Failed to update status"); }
  }

  async function deleteTask(id: string) {
    try { await apiClient.delete(`/tasks/${id}`); setMessage("Task deleted"); await load(); if (view === "list") await loadList(); }
    catch { setMessage("Failed to delete task"); }
  }

  async function addComment() {
    if (!selectedTask || !commentText.trim()) return;
    try { await apiClient.post(`/tasks/${selectedTask.id}/comments`, { body: commentText }); setCommentText(""); const res = await apiClient.get(`/tasks/${selectedTask.id}`); setSelectedTask(res.data.data); }
    catch { setMessage("Failed to add comment"); }
  }

  const cards = [
    { label: "Total", value: dashboard?.total || 0, color: "" }, { label: "Backlog", value: dashboard?.backlog || 0, color: "text-slate-600" },
    { label: "To Do", value: dashboard?.todo || 0, color: "text-blue-600" }, { label: "In Progress", value: dashboard?.inProgress || 0, color: "text-indigo-600" },
    { label: "Done", value: dashboard?.done || 0, color: "text-green-600" }, { label: "Cancelled", value: dashboard?.cancelled || 0, color: "text-red-600" },
  ];

  function TaskCard({ task }: { task: Task }) {
    return <div draggable className="cursor-grab rounded-xl border bg-white p-4 shadow-sm active:cursor-grabbing">
      <div className="flex items-start justify-between">
        <p className="text-xs font-black text-blue-600">{task.taskNumber}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-black ${priorityBadge[task.priority] || ""}`}>{task.priority}</span>
      </div>
      <h4 className="mt-2 text-sm font-black">{task.title}</h4>
      {task.description && <p className="mt-1 text-xs text-slate-400 line-clamp-2">{task.description}</p>}
      <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-400">
        {task.assignedTo ? <span>{task.assignedTo.user.name}</span> : <span>Unassigned</span>}
        {task.dueDate && <span>{new Date(task.dueDate).toLocaleDateString()}</span>}
      </div>
      <div className="mt-2 flex gap-1">
        <select className="w-full rounded-lg border bg-white px-2 py-1 text-xs font-bold" value={task.status} onChange={(e) => changeStatus(task.id, e.target.value)}>
          {columns.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
        </select>
        <button onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)} className="rounded-lg border p-1 text-slate-400 hover:bg-slate-50"><Circle size={14} /></button>
        <button onClick={() => deleteTask(task.id)} className="rounded-lg border p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
      </div>
    </div>;
  }

  return <div className="space-y-6">
    <section className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-8 text-white">
      <div className="flex items-center justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.28em] text-blue-200">Phase 10</p><h1 className="mt-3 text-4xl font-black">Task Management</h1><p className="mt-2 text-sm text-blue-100">Kanban board, sprint planning, recurring tasks and dependencies.</p></div>
        <div className="flex gap-3"><button onClick={() => setView(view === "kanban" ? "list" : "kanban")} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black">{view === "kanban" ? "List View" : "Kanban View"}</button><button onClick={load} className="rounded-xl bg-white/10 p-3"><RefreshCcw /></button></div>
      </div>
    </section>

    {message && <div className="rounded-xl bg-blue-50 p-4 text-sm font-bold text-blue-800">{message}</div>}

    <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => <div key={card.label} className="rounded-2xl border bg-white p-4"><CheckCircle2 className={card.color || "text-blue-700"} size={20}/><p className="mt-3 text-xs font-black uppercase text-slate-400">{card.label}</p><p className={`mt-1 text-xl font-black ${card.color || "text-slate-900"}`}>{card.value}</p></div>)}
    </section>

    <section className="rounded-2xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">{view === "kanban" ? "Kanban Board" : "All Tasks"}</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"><Plus size={17} />{showCreate ? "Cancel" : "Create Task"}</button>
      </div>

      {showCreate && <div className="mt-4 space-y-3"><div className="grid gap-3 md:grid-cols-2">
        <input className={field} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className={field} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p}>{p}</option>)}</select>
        <select className={field} value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}><option value="">Project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select className={field} value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}><option value="">Assign to</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.user?.name}</option>)}</select>
        <input className={field} placeholder="Est. hours" type="number" value={form.estimatedHrs} onChange={(e) => setForm({ ...form, estimatedHrs: e.target.value })} />
        <input className={field} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div><button onClick={createTask} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">Create Task</button></div>}

      {view === "kanban" ? (
        <div className="mt-5 grid gap-4 overflow-x-auto md:grid-cols-3 xl:grid-cols-6">
          {columns.map((col) => <div key={col} className={`min-w-[260px] rounded-2xl border-t-4 bg-slate-50 p-3 ${statusColors[col] || ""}`}>
            <h3 className="mb-3 text-sm font-black uppercase text-slate-500">{statusLabels[col]} ({kanban?.[col as keyof TaskKanban]?.length || 0})</h3>
            <div className="space-y-3">{(kanban?.[col as keyof TaskKanban] || []).map((t) => <TaskCard key={t.id} task={t} />)}</div>
          </div>)}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {tasks.length === 0 && <p className="text-center text-sm font-bold text-slate-400">No tasks found</p>}
          {tasks.map((task) => <article key={task.id} className="rounded-2xl border bg-white p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-black text-blue-600">{task.taskNumber}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${statusBadge[task.status] || ""}`}>{statusLabels[task.status]}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${priorityBadge[task.priority] || ""}`}>{task.priority}</span>
                </div>
                <h3 className="mt-2 text-lg font-black">{task.title}</h3>
                {task.description && <p className="mt-1 text-sm text-slate-500">{task.description}</p>}
                <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-400">
                  {task.assignedTo && <span>{task.assignedTo.user.name}</span>}
                  {task.project && <span>{task.project.name}</span>}
                  {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                  {task.estimatedHrs && <span>{task.estimatedHrs}h est.</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => deleteTask(task.id)} className="rounded-xl border p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={18} /></button>
                <button onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)} className="rounded-xl border p-2 text-slate-500 hover:bg-slate-50"><Circle size={18} /></button>
              </div>
            </div>

            {selectedTask?.id === task.id && <div className="mt-5 border-t pt-5">
              <div className="flex flex-wrap gap-2">
                <select className={field + " w-auto"} value={task.status} onChange={(e) => changeStatus(task.id, e.target.value)}>
                  {columns.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
              </div>

              <div className="mt-5 space-y-3">
                <h4 className="font-black">Comments ({task.comments.length})</h4>
                {task.comments.length === 0 && <p className="text-sm text-slate-400">No comments yet</p>}
                {task.comments.map((comment) => <div key={comment.id} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-400">{comment.author?.name || "Unknown"} &middot; {new Date(comment.createdAt).toLocaleString()}</p>
                  <p className="mt-1 text-sm font-semibold">{comment.body}</p>
                </div>)}
              </div>

              <div className="mt-4 flex gap-2">
                <input className={field} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." onKeyDown={(e) => { if (e.key === "Enter") addComment(); }} />
                <button onClick={addComment} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">Send</button>
              </div>
            </div>}
          </article>)}
        </div>
      )}
    </section>
  </div>;
}
