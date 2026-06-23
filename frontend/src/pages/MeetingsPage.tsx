import { useEffect, useRef, useState } from "react";
import { Plus, RefreshCcw, Video, VideoOff, Calendar, Clock, Users, XCircle, Play, ExternalLink, Copy, Check } from "lucide-react";
import { apiClient } from "../api/client";
import { getUser } from "../lib/auth";
import type { VideoMeeting, MeetingDashboard } from "../types/meeting";

const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";
const user = getUser();
const MEET_DOMAIN = "https://meet.jit.si";

const statusBadge: Record<string, string> = { SCHEDULED: "bg-blue-50 text-blue-700", ACTIVE: "bg-green-50 text-green-700", ENDED: "bg-slate-100 text-slate-500", CANCELLED: "bg-red-50 text-red-700" };

function meetingUrl(roomName: string) { return `${MEET_DOMAIN}/${roomName}`; }

export default function MeetingsPage() {
  const [dashboard, setDashboard] = useState<MeetingDashboard | null>(null);
  const [meetings, setMeetings] = useState<VideoMeeting[]>([]);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"list" | "meet">("list");
  const [showCreate, setShowCreate] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<VideoMeeting | null>(null);
  const [showJitsi, setShowJitsi] = useState(false);
  const jitsiRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({ title: "", description: "", meetingType: "INSTANT" as string, scheduledAt: "" });
  const [copied, setCopied] = useState("");

  function copyLink(roomName: string) {
    navigator.clipboard.writeText(meetingUrl(roomName));
    setCopied(roomName);
    setTimeout(() => setCopied(""), 2000);
  }

  async function load() {
    try {
      const [dash, list] = await Promise.all([
        apiClient.get("/meetings/dashboard"),
        apiClient.get("/meetings"),
      ]);
      setDashboard(dash.data.data);
      setMeetings(list.data.data || []);
    } catch { setMessage("Unable to load meetings"); }
  }
  useEffect(() => { void load(); }, []);

  async function createMeeting() {
    try {
      if (!form.title.trim()) { setMessage("Title is required"); return; }
      const payload: any = { title: form.title, description: form.description, meetingType: form.meetingType };
      if (form.meetingType === "SCHEDULED" && form.scheduledAt) payload.scheduledAt = form.scheduledAt;
      const res = await apiClient.post("/meetings", payload);
      setMessage("Meeting created");
      setShowCreate(false);
      setForm({ title: "", description: "", meetingType: "INSTANT", scheduledAt: "" });
      await load();
      if (form.meetingType === "INSTANT") {
        setActiveMeeting(res.data.data);
        setShowJitsi(true);
        setView("meet");
      }
    } catch { setMessage("Failed to create meeting"); }
  }

  async function deleteMeeting(id: string) {
    try { await apiClient.delete(`/meetings/${id}`); setMessage("Meeting deleted"); await load(); } catch { setMessage("Failed to delete"); }
  }

  async function changeStatus(id: string, action: "start" | "end" | "cancel") {
    try {
      const endpoints: Record<string, string> = { start: "start", end: "end", cancel: "cancel" };
      const res = await apiClient.post(`/meetings/${id}/${endpoints[action]}`);
      setMessage(`Meeting ${action === "start" ? "started" : action === "end" ? "ended" : "cancelled"}`);
      if (action === "start") { setActiveMeeting(res.data.data); setShowJitsi(true); setView("meet"); }
      await load();
    } catch { setMessage(`Failed to ${action} meeting`); }
  }

  async function joinMeeting(id: string) {
    try {
      const res = await apiClient.post(`/meetings/${id}/join`);
      setActiveMeeting(res.data.data.meeting);
      setShowJitsi(true);
      setView("meet");
    } catch { setMessage("Failed to join meeting"); }
  }

  function loadJitsi(roomName: string) {
    if (!jitsiRef.current || showJitsi === false) return;
    jitsiRef.current.innerHTML = "";
    const domain = "meet.jit.si";
    const options = {
      roomName,
      width: "100%",
      height: "100%",
      parentNode: jitsiRef.current,
      userInfo: { displayName: user?.name || "User" },
      configOverrides: { startWithAudioMuted: true, startWithVideoMuted: true },
      interfaceConfigOverrides: { SHOW_JITSI_WATERMARK: false, SHOW_WATERMARK_FOR_GUESTS: false, TOOLBAR_ALWAYS_VISIBLE: true },
    };
    const script = document.createElement("script");
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    script.onload = () => {
      new (window as any).JitsiMeetExternalAPI(domain, options);
    };
    document.body.appendChild(script);
  }

  useEffect(() => { if (showJitsi && activeMeeting) loadJitsi(activeMeeting.roomName); }, [showJitsi, activeMeeting?.roomName]);

  function closeJitsi() {
    setShowJitsi(false);
    setActiveMeeting(null);
    setView("list");
  }

  const cards = [
    { label: "Total Meetings", value: dashboard?.total || 0, icon: Video },
    { label: "Scheduled", value: dashboard?.scheduled || 0, icon: Calendar },
    { label: "Active Now", value: dashboard?.active || 0, icon: Play, color: "text-green-600" },
    { label: "My Meetings", value: dashboard?.myMeetings || 0, icon: Users },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-6 md:p-8 text-white">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[.28em] text-blue-200">Meetings</p>
            <h1 className="mt-3 text-2xl md:text-4xl font-black">Video Conferencing</h1>
            <p className="mt-2 text-xs md:text-sm text-blue-100">Jitsi Meet — instant and scheduled meetings. Share the link for others to join.</p>
          </div>
          <div className="flex gap-2 md:gap-3 shrink-0">
            {showJitsi && <button onClick={closeJitsi} className="rounded-xl bg-red-500 px-3 md:px-4 py-2 text-xs md:text-sm font-black text-white">Leave</button>}
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

      {!showJitsi && (
        <>
          <section className="grid gap-3 md:gap-4 grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border bg-white p-3 md:p-4">
                  <Icon className={card.color || "text-blue-700"} size={18} />
                  <p className="mt-2 md:mt-3 text-[10px] md:text-xs font-black uppercase text-slate-400">{card.label}</p>
                  <p className={`mt-0.5 md:mt-1 text-xl md:text-2xl font-black ${card.color || "text-slate-900"}`}>{card.value}</p>
                </div>
              );
            })}
          </section>

          <section className="rounded-2xl border bg-white p-4 md:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-black">Meetings</h2>
              <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 md:px-5 py-2.5 md:py-3 text-xs md:text-sm font-black text-white">
                <Plus size={16} />{showCreate ? "Cancel" : "New Meeting"}
              </button>
            </div>

            {showCreate && (
              <div className="mt-4 space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 md:p-5">
                <h3 className="font-black text-blue-800">Create Meeting</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className={field} placeholder="Meeting title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <select className={field} value={form.meetingType} onChange={(e) => setForm({ ...form, meetingType: e.target.value })}>
                    <option value="INSTANT">Instant (start now)</option>
                    <option value="SCHEDULED">Schedule for later</option>
                  </select>
                  <input className={field} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  {form.meetingType === "SCHEDULED" && (
                    <input className={field} type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
                  )}
                </div>
                <button onClick={createMeeting} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white">
                  {form.meetingType === "INSTANT" ? "Start Meeting" : "Schedule Meeting"}
                </button>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {meetings.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No meetings yet</p>}
              {meetings.map((meeting) => (
                <div key={meeting.id} className="rounded-2xl border bg-white p-5 transition hover:shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${statusBadge[meeting.status] || ""}`}>{meeting.status}</span>
                        <span className="text-xs font-bold text-slate-400">{meeting.meetingType}</span>
                        <span className="text-xs text-slate-400">Created by {meeting.createdBy?.name || "Unknown"}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-black">{meeting.title}</h3>
                      {meeting.description && <p className="mt-1 text-sm text-slate-500">{meeting.description}</p>}

                      {/* Meeting Link - prominently displayed */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5 border border-slate-200">
                        <code className="flex-1 text-xs font-bold text-slate-600 truncate min-w-0">{meetingUrl(meeting.roomName)}</code>
                        <button onClick={() => copyLink(meeting.roomName)} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-700 shrink-0">
                          {copied === meeting.roomName ? <><Check size={14} />Copied</> : <><Copy size={14} />Copy Link</>}
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 md:gap-4 text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1"><Users size={14} />{meeting._count?.participants || 0} participants</span>
                        {meeting.scheduledAt && <span className="flex items-center gap-1"><Clock size={14} />{new Date(meeting.scheduledAt).toLocaleString()}</span>}
                        {meeting.startedAt && <span>Started: {new Date(meeting.startedAt).toLocaleString()}</span>}
                        {meeting.endedAt && <span>Ended: {new Date(meeting.endedAt).toLocaleString()}</span>}
                      </div>

                      {meeting.participants.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {meeting.participants.map((p) => (
                            <span key={p.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{p.user?.name || "Unknown"}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {meeting.status === "ACTIVE" && (
                        <button onClick={() => joinMeeting(meeting.id)} className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-black text-white hover:bg-green-700"><Play size={16} />Join</button>
                      )}
                      {meeting.status === "SCHEDULED" && (
                        <button onClick={() => changeStatus(meeting.id, "start")} className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700"><Play size={16} />Start</button>
                      )}
                      {meeting.status === "ACTIVE" && (
                        <button onClick={() => changeStatus(meeting.id, "end")} className="rounded-xl border px-4 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50"><VideoOff size={16} className="inline mr-1" />End</button>
                      )}
                      {(meeting.status === "SCHEDULED" || meeting.status === "ACTIVE") && (
                        <button onClick={() => changeStatus(meeting.id, "cancel")} className="rounded-xl border px-3 py-2.5 text-sm text-red-500 hover:bg-red-50"><XCircle size={16} /></button>
                      )}
                      <a href={meetingUrl(meeting.roomName)} target="_blank" rel="noopener noreferrer" className="rounded-xl border p-2.5 text-slate-400 hover:bg-slate-50" title="Open in new tab"><ExternalLink size={16} /></a>
                      {meeting.status !== "ACTIVE" && (
                        <button onClick={() => deleteMeeting(meeting.id)} className="rounded-xl border p-2.5 text-red-400 hover:bg-red-50"><XCircle size={16} /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {showJitsi && activeMeeting && (
        <section className="rounded-2xl border bg-white overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b bg-slate-50 px-4 md:px-6 py-4 gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-black truncate">{activeMeeting.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs font-bold text-slate-500 truncate">{meetingUrl(activeMeeting.roomName)}</code>
                <button onClick={() => copyLink(activeMeeting.roomName)} className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-black text-white hover:bg-blue-700 shrink-0">
                  {copied === activeMeeting.roomName ? <><Check size={12} />Copied</> : <><Copy size={12} />Copy</>}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={meetingUrl(activeMeeting.roomName)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-black text-slate-600 hover:bg-slate-50"><ExternalLink size={16} />New Tab</a>
              <button onClick={closeJitsi} className="flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2 text-sm font-black text-white hover:bg-red-700"><VideoOff size={16} />Leave</button>
            </div>
          </div>
          <div ref={jitsiRef} className="h-[400px] md:h-[600px] w-full" />
        </section>
      )}
    </div>
  );
}
