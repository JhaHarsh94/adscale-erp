import { useEffect, useState } from "react";
import { FolderKanban, Plus, RefreshCcw } from "lucide-react";
import { apiClient } from "../api/client";
import type { Client } from "../types/crm";
import type { Employee } from "../types/employee";
import type { Project, ProjectDashboard } from "../types/project";

const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";
const money = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [dashboard, setDashboard] = useState<ProjectDashboard | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [message, setMessage] = useState("");
  const [milestones, setMilestones] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "Website Growth Project", clientId: "", managerId: "", description: "Website, SEO and paid media delivery", priority: "HIGH", budget: 150000 });

  async function load() {
    try {
      const [summary, projectList, clientList, employeeList] = await Promise.all([
        apiClient.get("/projects/dashboard"), apiClient.get("/projects"), apiClient.get("/crm/clients"), apiClient.get("/employees"),
      ]);
      setDashboard(summary.data.data); setProjects(projectList.data.data || []); setClients(clientList.data.data || []); setEmployees(employeeList.data.data || []);
      setForm((current) => ({ ...current, clientId: current.clientId || clientList.data.data?.[0]?.id || "", managerId: current.managerId || employeeList.data.data?.[0]?.id || "" }));
    } catch { setMessage("Unable to load projects"); }
  }
  useEffect(() => { void load(); }, []);

  async function createProject() { try { await apiClient.post("/projects", form); setMessage("Project created successfully"); await load(); } catch { setMessage("Project name and CRM client are required"); } }
  async function updateProject(id: string, data: Record<string, string>) { await apiClient.put(`/projects/${id}`, data); await load(); }
  async function addMilestone(id: string) { if (!milestones[id]) return; await apiClient.post(`/projects/${id}/milestones`, { title: milestones[id] }); setMilestones({ ...milestones, [id]: "" }); await load(); }
  async function updateMilestone(projectId: string, milestoneId: string, status: string) { await apiClient.put(`/projects/${projectId}/milestones/${milestoneId}`, { status }); await load(); }
  async function addMember(id: string) { if (!members[id]) return; await apiClient.post(`/projects/${id}/members`, { employeeId: members[id], role: "MEMBER", allocation: 100 }); await load(); }

  const cards = [
    { label: "Projects", value: dashboard?.total || 0 }, { label: "Active", value: dashboard?.active || 0 },
    { label: "Completed", value: dashboard?.completed || 0 }, { label: "At risk", value: dashboard?.atRisk || 0 },
    { label: "Budget", value: money(dashboard?.totalBudget || 0) }, { label: "Cost", value: money(dashboard?.totalCost || 0) },
  ];

  return <div className="space-y-6">
    <section className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-8 text-white"><div className="flex justify-between"><div><p className="text-xs font-black uppercase tracking-[.28em] text-blue-200">Phase 8</p><h1 className="mt-3 text-4xl font-black">Project Management</h1><p className="mt-2 text-sm text-blue-100">Projects, budgets, milestones, health and team allocation.</p></div><button onClick={load} className="h-fit rounded-xl bg-white/10 p-3"><RefreshCcw /></button></div></section>
    {message && <div className="rounded-xl bg-blue-50 p-4 text-sm font-bold text-blue-800">{message}</div>}
    <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">{cards.map((card) => <div key={card.label} className="rounded-2xl border bg-white p-4"><FolderKanban className="text-blue-700" size={20}/><p className="mt-3 text-xs font-black uppercase text-slate-400">{card.label}</p><p className="mt-1 text-xl font-black">{card.value}</p></div>)}</section>
    <section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-black">Create project</h2><div className="mt-4 grid gap-3 md:grid-cols-3"><input className={field} value={form.name} onChange={(e) => setForm({...form,name:e.target.value})}/><select className={field} value={form.clientId} onChange={(e)=>setForm({...form,clientId:e.target.value})}><option value="">Select client</option>{clients.map((client)=><option key={client.id} value={client.id}>{client.name}</option>)}</select><select className={field} value={form.managerId} onChange={(e)=>setForm({...form,managerId:e.target.value})}><option value="">Project manager</option>{employees.map((employee)=><option key={employee.id} value={employee.id}>{employee.user?.name}</option>)}</select><input className={field} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/><select className={field} value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value})}>{["LOW","MEDIUM","HIGH","URGENT"].map((item)=><option key={item}>{item}</option>)}</select><input className={field} type="number" value={form.budget} onChange={(e)=>setForm({...form,budget:Number(e.target.value)})}/></div><button onClick={createProject} className="mt-4 flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"><Plus size={17}/>Create project</button></section>
    <section className="grid gap-5 xl:grid-cols-2">{projects.map((project)=><article key={project.id} className="rounded-2xl border bg-white p-6"><div className="flex justify-between"><div><p className="text-xs font-black text-blue-600">{project.projectCode}</p><h2 className="text-xl font-black">{project.name}</h2><p className="text-sm text-slate-500">{project.client.name} - {money(project.budget || 0)}</p></div><span className="h-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{project.health}</span></div><div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{width:`${project.progress}%`}}/></div><p className="text-right text-xs font-black">{project.progress}%</p><div className="mt-3 grid grid-cols-2 gap-2"><select className={field} value={project.status} onChange={(e)=>updateProject(project.id,{status:e.target.value})}>{["PLANNING","ACTIVE","ON_HOLD","COMPLETED","CANCELLED"].map((item)=><option key={item}>{item}</option>)}</select><select className={field} value={project.health} onChange={(e)=>updateProject(project.id,{health:e.target.value})}>{["ON_TRACK","AT_RISK","OFF_TRACK"].map((item)=><option key={item}>{item}</option>)}</select></div><h3 className="mt-5 font-black">Milestones</h3>{project.milestones.map((item)=><div key={item.id} className="mt-2 flex justify-between rounded-xl bg-slate-50 p-3"><span className="text-sm font-bold">{item.title}</span><select value={item.status} onChange={(e)=>updateMilestone(project.id,item.id,e.target.value)} className="rounded-lg border text-xs font-bold">{["PENDING","IN_PROGRESS","COMPLETED","BLOCKED"].map((status)=><option key={status}>{status}</option>)}</select></div>)}<div className="mt-2 flex gap-2"><input className={field} value={milestones[project.id]||""} onChange={(e)=>setMilestones({...milestones,[project.id]:e.target.value})} placeholder="New milestone"/><button onClick={()=>addMilestone(project.id)} className="rounded-xl bg-blue-700 px-3 text-white"><Plus/></button></div><h3 className="mt-5 font-black">Team ({project.members.length})</h3><div className="mt-2 flex gap-2"><select className={field} value={members[project.id]||""} onChange={(e)=>setMembers({...members,[project.id]:e.target.value})}><option value="">Allocate employee</option>{employees.map((employee)=><option key={employee.id} value={employee.id}>{employee.user?.name}</option>)}</select><button onClick={()=>addMember(project.id)} className="rounded-xl bg-slate-900 px-3 text-white"><Plus/></button></div></article>)}</section>
  </div>;
}
