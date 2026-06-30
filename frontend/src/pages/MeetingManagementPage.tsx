import { useEffect, useState } from "react";
import { Plus, RefreshCcw, Calendar, Clock, Users, XCircle, Play, CheckCircle, X, FileText, ListChecks, UserCheck, AlignLeft, Trash2, Save, CalendarDays, MapPin, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { apiClient } from "../api/client";
import { getUser } from "../lib/auth";
import type { FormalMeeting, MeetingManagementDashboard, MeetingActionItem, MeetingAgendaItem, MeetingAttendanceRecord, MeetingMinutes } from "../types/meetingManagement";

const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";
const user = getUser();

const statusBadge: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
};

const actionStatusBadge: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
};

export default function MeetingManagementPage() {
  const [dashboard, setDashboard] = useState<MeetingManagementDashboard | null>(null);
  const [meetings, setMeetings] = useState<FormalMeeting[]>([]);
  const [message, setMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("agenda");

  const [form, setForm] = useState({ title: "", description: "", meetingDate: "", startTime: "", endTime: "", location: "", agendaInput: "" });
  const [agendaInputs, setAgendaInputs] = useState<string[]>([""]);

  const [minutesInput, setMinutesInput] = useState("");
  const [savingMinutes, setSavingMinutes] = useState(false);

  const [newActionItem, setNewActionItem] = useState("");

  const [allEmployees, setAllEmployees] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => { void loadEmployees(); }, []);

  async function loadEmployees() {
    try {
      const res = await apiClient.get("/employees");
      const list = (res.data.data || []).map((e: any) => ({ id: e.id, name: e.user?.name || e.employeeCode }));
      setAllEmployees(list);
    } catch {}
  }

  async function load() {
    try {
      const [dash, list] = await Promise.all([
        apiClient.get("/meeting-management/dashboard"),
        apiClient.get("/meeting-management"),
      ]);
      setDashboard(dash.data.data);
      setMeetings(list.data.data || []);
    } catch { setMessage("Unable to load meetings"); }
  }
  useEffect(() => { void load(); }, []);

  async function createMeeting() {
    try {
      if (!form.title.trim()) { setMessage("Title is required"); return; }
      if (!form.meetingDate) { setMessage("Meeting date is required"); return; }
      const agendaItems = agendaInputs.filter((a) => a.trim()).map((a, i) => ({ title: a, sortOrder: i + 1 }));
      const payload: any = {
        title: form.title,
        description: form.description,
        meetingDate: form.meetingDate,
        location: form.location,
        agendaItems,
      };
      if (form.startTime) payload.startTime = form.startTime;
      if (form.endTime) payload.endTime = form.endTime;
      await apiClient.post("/meeting-management", payload);
      setMessage("Meeting scheduled");
      setShowCreate(false);
      setForm({ title: "", description: "", meetingDate: "", startTime: "", endTime: "", location: "", agendaInput: "" });
      setAgendaInputs([""]);
      void load();
    } catch { setMessage("Failed to create meeting"); }
  }

  async function deleteMeeting(id: string) {
    try { await apiClient.delete(`/meeting-management/${id}`); setMessage("Meeting deleted"); void load(); } catch { setMessage("Failed to delete"); }
  }

  async function changeMeetingStatus(id: string, action: string) {
    try {
      await apiClient.put(`/meeting-management/${id}/status`, { action });
      setMessage(`Meeting ${action === "IN_PROGRESS" ? "started" : action === "COMPLETED" ? "completed" : "cancelled"}`);
      void load();
    } catch { setMessage(`Failed to update meeting`); }
  }

  async function toggleAttendance(meetingId: string, employeeId: string, attended: boolean) {
    try {
      await apiClient.put(`/meeting-management/${meetingId}/attendance`, { employeeId, attended });
      void load();
    } catch { setMessage("Failed to update attendance"); }
  }

  async function saveMinutes(meetingId: string) {
    if (!minutesInput.trim()) { setMessage("Minutes content is required"); return; }
    setSavingMinutes(true);
    try {
      await apiClient.put(`/meeting-management/${meetingId}/minutes`, { content: minutesInput });
      setMessage("Minutes saved");
      setMinutesInput("");
      void load();
    } catch { setMessage("Failed to save minutes"); }
    setSavingMinutes(false);
  }

  async function addActionItem(meetingId: string) {
    if (!newActionItem.trim()) { setMessage("Action item description is required"); return; }
    try {
      await apiClient.post(`/meeting-management/${meetingId}/action-items`, { description: newActionItem });
      setNewActionItem("");
      void load();
    } catch { setMessage("Failed to add action item"); }
  }

  async function updateActionItemStatus(itemId: string, status: string) {
    try {
      await apiClient.put(`/meeting-management/action-items/${itemId}`, { status });
      void load();
    } catch { setMessage("Failed to update action item"); }
  }

  async function deleteActionItem(itemId: string) {
    try { await apiClient.delete(`/meeting-management/action-items/${itemId}`); void load(); } catch { setMessage("Failed to delete action item"); }
  }

  async function deleteAgendaItem(agendaId: string) {
    try { await apiClient.delete(`/meeting-management/agenda/${agendaId}`); void load(); } catch { setMessage("Failed to delete agenda item"); }
  }

  function toggleExpand(id: string, tab?: string) {
    if (expandedMeeting === id) {
      setExpandedMeeting(null);
    } else {
      setExpandedMeeting(id);
      if (tab) setActiveTab(tab);
      const meeting = meetings.find((m) => m.id === id);
      if (meeting?.minutes) setMinutesInput(meeting.minutes.content);
      else setMinutesInput("");
    }
  }

  const cards = [
    { label: "Total Meetings", value: dashboard?.total || 0, icon: Calendar },
    { label: "Scheduled", value: dashboard?.scheduled || 0, icon: CalendarDays },
    { label: "In Progress", value: dashboard?.inProgress || 0, icon: Play, color: "text-amber-600" },
    { label: "Completed", value: dashboard?.completed || 0, icon: CheckCircle, color: "text-green-600" },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-950 p-6 md:p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.28em] text-emerald-200">Phase 16</p>
            <h1 className="mt-3 text-2xl md:text-4xl font-black">Meeting Management</h1>
            <p className="mt-2 text-xs md:text-sm text-emerald-100">Schedule meetings, set agendas, track attendance, record MOM, and manage action items.</p>
          </div>
          <div className="flex gap-2 md:gap-3 shrink-0">
            <button onClick={load} className="rounded-xl bg-white/10 p-2.5 md:p-3"><RefreshCcw size={18} /></button>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl bg-blue-50 p-3 md:p-4 text-xs md:text-sm font-bold text-blue-800 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-blue-400 hover:text-blue-700"><XCircle size={16} /></button>
        </div>
      )}

      <section className="grid gap-3 md:gap-4 grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border bg-white p-3 md:p-4">
              <Icon className={card.color || "text-emerald-700"} size={18} />
              <p className="mt-2 md:mt-3 text-[10px] md:text-xs font-black uppercase text-slate-400">{card.label}</p>
              <p className={`mt-0.5 md:mt-1 text-xl md:text-2xl font-black ${card.color || "text-slate-900"}`}>{card.value}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border bg-white p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-black">Formal Meetings</h2>
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 rounded-xl bg-emerald-700 px-4 md:px-5 py-2.5 md:py-3 text-xs md:text-sm font-black text-white">
            <Plus size={16} />{showCreate ? "Cancel" : "Schedule Meeting"}
          </button>
        </div>

        {showCreate && (
          <div className="mt-4 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 md:p-5">
            <h3 className="font-black text-emerald-800">Schedule New Meeting</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input className={field} placeholder="Meeting title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input className={field} type="date" value={form.meetingDate} onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} />
              <input className={field} type="datetime-local" placeholder="Start time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              <input className={field} type="datetime-local" placeholder="End time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              <input className={`${field} md:col-span-2`} placeholder="Location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <textarea className={`${field} md:col-span-2 min-h-[60px]`} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black text-emerald-700">Agenda Items</p>
              {agendaInputs.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input className={`${field} flex-1`} placeholder={`Agenda item ${idx + 1}`} value={item} onChange={(e) => {
                    const next = [...agendaInputs];
                    next[idx] = e.target.value;
                    setAgendaInputs(next);
                  }} />
                  {agendaInputs.length > 1 && (
                    <button onClick={() => setAgendaInputs(agendaInputs.filter((_, i) => i !== idx))} className="rounded-xl border p-2 text-red-500"><X size={16} /></button>
                  )}
                </div>
              ))}
              <button onClick={() => setAgendaInputs([...agendaInputs, ""])} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">+ Add agenda item</button>
            </div>
            <button onClick={createMeeting} className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white">Schedule Meeting</button>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {meetings.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No formal meetings scheduled</p>}
          {meetings.map((meeting) => (
            <div key={meeting.id} className="rounded-2xl border bg-white transition hover:shadow-sm">
              <div className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${statusBadge[meeting.status] || ""}`}>{meeting.status.replace("_", " ")}</span>
                      <span className="text-xs font-bold text-slate-400">Created by {meeting.createdBy?.name || "Unknown"}</span>
                    </div>
                    <h3 className="mt-2 text-lg font-black">{meeting.title}</h3>
                    {meeting.description && <p className="mt-1 text-sm text-slate-500">{meeting.description}</p>}

                    <div className="mt-3 flex flex-wrap gap-3 md:gap-4 text-xs font-bold text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={14} />{new Date(meeting.meetingDate).toLocaleDateString()}</span>
                      {meeting.startTime && <span className="flex items-center gap-1"><Clock size={14} />{new Date(meeting.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                      {meeting.endTime && <span>- {new Date(meeting.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                      {meeting.location && <span className="flex items-center gap-1"><MapPin size={14} />{meeting.location}</span>}
                      <span className="flex items-center gap-1"><ListChecks size={14} />{meeting.actionItems.length} action items</span>
                      <span className="flex items-center gap-1"><UserCheck size={14} />{meeting.attendance.filter((a) => a.attended).length}/{meeting.attendance.length} attended</span>
                      {meeting.minutes && <span className="flex items-center gap-1"><FileText size={14} />MOM saved</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {meeting.status === "SCHEDULED" && (
                      <button onClick={() => changeMeetingStatus(meeting.id, "IN_PROGRESS")} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700"><Play size={16} />Start</button>
                    )}
                    {meeting.status === "IN_PROGRESS" && (
                      <button onClick={() => changeMeetingStatus(meeting.id, "COMPLETED")} className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-black text-white hover:bg-green-700"><CheckCircle size={16} />Complete</button>
                    )}
                    {(meeting.status === "SCHEDULED" || meeting.status === "IN_PROGRESS") && (
                      <button onClick={() => changeMeetingStatus(meeting.id, "CANCELLED")} className="rounded-xl border px-3 py-2.5 text-sm text-red-500 hover:bg-red-50"><XCircle size={16} /></button>
                    )}
                    <button onClick={() => toggleExpand(meeting.id)} className="rounded-xl border px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
                      {expandedMeeting === meeting.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {meeting.status !== "IN_PROGRESS" && (
                      <button onClick={() => deleteMeeting(meeting.id)} className="rounded-xl border p-2.5 text-red-400 hover:bg-red-50"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              </div>

              {expandedMeeting === meeting.id && (
                <div className="border-t border-slate-100">
                  <div className="flex border-b border-slate-100">
                    {[
                      { key: "agenda", label: "Agenda", icon: AlignLeft },
                      { key: "attendance", label: "Attendance", icon: UserCheck },
                      { key: "minutes", label: "Minutes (MOM)", icon: FileText },
                      { key: "actions", label: "Action Items", icon: ListChecks },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          className={`flex items-center gap-1.5 px-4 py-3 text-xs font-black border-b-2 transition ${activeTab === tab.key ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-700"}`}
                        ><Icon size={14} />{tab.label}</button>
                      );
                    })}
                  </div>

                  <div className="p-5">
                    {activeTab === "agenda" && (
                      <div className="space-y-2">
                        {meeting.agendaItems.length === 0 && <p className="text-sm text-slate-400">No agenda items</p>}
                        {meeting.agendaItems.map((item) => (
                          <div key={item.id} className="flex items-start justify-between rounded-xl bg-slate-50 p-3">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{item.sortOrder}. {item.title}</p>
                              {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
                              {item.durationMins && <p className="text-xs text-slate-400 mt-1">{item.durationMins} min</p>}
                            </div>
                            <button onClick={() => deleteAgendaItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "attendance" && (
                      <div className="space-y-2">
                        <p className="text-xs font-black text-slate-500 mb-3">Mark who attended</p>
                        {allEmployees.map((emp) => {
                          const record = meeting.attendance.find((a) => a.employeeId === emp.id);
                          return (
                            <div key={emp.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                              <span className="text-sm font-bold text-slate-700">{emp.name}</span>
                              <button
                                onClick={() => toggleAttendance(meeting.id, emp.id, !record?.attended)}
                                className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${record?.attended ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}
                              >{record?.attended ? "Present" : "Absent"}</button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activeTab === "minutes" && (
                      <div className="space-y-3">
                        {meeting.minutes && (
                          <div className="rounded-xl bg-slate-50 p-4 mb-3">
                            <p className="text-xs font-black text-slate-500 mb-2">Saved Minutes</p>
                            <p className="text-sm whitespace-pre-wrap">{meeting.minutes.content}</p>
                          </div>
                        )}
                        <textarea
                          className={`${field} min-h-[150px]`}
                          placeholder="Write minutes of meeting (MOM)..."
                          value={minutesInput}
                          onChange={(e) => setMinutesInput(e.target.value)}
                        />
                        <button onClick={() => saveMinutes(meeting.id)} disabled={savingMinutes} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">
                          <Save size={16} />{savingMinutes ? "Saving..." : "Save Minutes"}
                        </button>
                      </div>
                    )}

                    {activeTab === "actions" && (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input className={field} placeholder="New action item..." value={newActionItem} onChange={(e) => setNewActionItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addActionItem(meeting.id)} />
                          <button onClick={() => addActionItem(meeting.id)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 shrink-0"><Plus size={16} /></button>
                        </div>
                        {meeting.actionItems.length === 0 && <p className="text-sm text-slate-400">No action items</p>}
                        {meeting.actionItems.map((item) => (
                          <div key={item.id} className="flex items-start justify-between rounded-xl bg-slate-50 p-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${actionStatusBadge[item.status]}`}>{item.status}</span>
                                <p className={`text-sm font-bold ${item.status === "COMPLETED" ? "line-through text-slate-400" : "text-slate-800"}`}>{item.description}</p>
                              </div>
                              <div className="flex gap-3 mt-1 text-xs text-slate-400">
                                {item.assignedTo && <span>Assigned to: {item.assignedTo.user.name}</span>}
                                {item.dueDate && <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {item.status === "PENDING" && <button onClick={() => updateActionItemStatus(item.id, "IN_PROGRESS")} className="rounded-lg border p-1.5 text-blue-500 hover:bg-blue-50" title="Start"><Play size={14} /></button>}
                              {item.status === "IN_PROGRESS" && <button onClick={() => updateActionItemStatus(item.id, "COMPLETED")} className="rounded-lg border p-1.5 text-green-500 hover:bg-green-50" title="Complete"><CheckCircle size={14} /></button>}
                              {(item.status === "PENDING" || item.status === "IN_PROGRESS") && <button onClick={() => updateActionItemStatus(item.id, "CANCELLED")} className="rounded-lg border p-1.5 text-red-400 hover:bg-red-50" title="Cancel"><XCircle size={14} /></button>}
                              <button onClick={() => deleteActionItem(item.id)} className="rounded-lg border p-1.5 text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
