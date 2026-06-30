import { useEffect, useState } from "react";
import {
  Camera, Clock3, Fingerprint, Loader2, MapPin, QrCode, RefreshCcw, TimerReset, AlertTriangle, X,
} from "lucide-react";
import { apiClient } from "../api/client";
import type { AttendanceRecord } from "../types/attendance";

export default function AttendancePage() {
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [report, setReport] = useState<AttendanceRecord[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [noEmployee, setNoEmployee] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("https://example.com/selfie.jpg");
  const [deviceId, setDeviceId] = useState("");
  const [biometricUserId, setBiometricUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function boot() {
    setLoading(true);
    try {
      const me = await apiClient.get("/auth/me");
      const empId = me.data.data?.employee?.id || "";
      setEmployeeId(empId);
      setNoEmployee(!empId);
      if (empId) {
        const [todayRes, reportRes] = await Promise.all([
          apiClient.get(`/attendance/today?employeeId=${empId}`),
          apiClient.get("/attendance/report"),
        ]);
        setToday(todayRes.data.data);
        setReport(reportRes.data.data || []);
      }
    } finally { setLoading(false); }
  }

  useEffect(() => { void boot(); }, []);

  async function refreshToday() {
    if (!employeeId) return;
    try { const res = await apiClient.get(`/attendance/today?employeeId=${employeeId}`); setToday(res.data.data); } catch {}
  }
  async function refreshReport() {
    try { const res = await apiClient.get("/attendance/report"); setReport(res.data.data || []); } catch {}
  }

  async function runAction(action: () => Promise<any>, successText: string) {
    if (!employeeId) { setMessage("No employee linked to your account"); return; }
    setLoading(true); setMessage("");
    try {
      await action();
      setMessage(successText);
      await refreshToday(); await refreshReport();
    } catch (err: any) { setMessage(err?.response?.data?.message || "Action failed"); }
    finally { setLoading(false); }
  }

  function normalCheckIn() { return runAction(() => apiClient.post("/attendance/check-in", { employeeId, method: "NORMAL" }), "Normal check-in successful"); }
  function normalCheckOut() { return runAction(() => apiClient.post("/attendance/check-out", { employeeId, method: "NORMAL" }), "Normal check-out successful"); }
  function qrCheckIn() { return runAction(() => apiClient.post("/attendance/qr/check-in", { employeeId, qrToken }), "QR check-in successful"); }
  function selfieCheckIn() { return runAction(() => apiClient.post("/attendance/selfie/check-in", { employeeId, selfieUrl }), "Selfie check-in successful"); }
  function gpsCheckIn() {
    if (!employeeId) { setMessage("No employee linked to your account"); return; }
    setLoading(true); setMessage("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await apiClient.post("/attendance/gps/check-in", { employeeId, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyM: position.coords.accuracy });
          setMessage("GPS check-in successful"); await refreshToday(); await refreshReport();
        } catch (err: any) { setMessage(err?.response?.data?.message || "GPS check-in failed"); }
        finally { setLoading(false); }
      },
      () => { setMessage("Location permission denied"); setLoading(false); }
    );
  }
  function biometricCheckIn() { return runAction(() => apiClient.post("/attendance/biometric/attendance", { deviceId, biometricUserId, action: "CHECK_IN", rawPayload: { source: "frontend-test" } }), "Biometric check-in successful"); }
  function startBreak() { return runAction(() => apiClient.post("/attendance/break/start", { employeeId, notes: "Break from frontend" }), "Break started successfully"); }
  function endBreak() { return runAction(() => apiClient.post("/attendance/break/end", { employeeId }), "Break ended successfully"); }

  return (
    <div className="space-y-4 md:space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 p-6 md:p-8 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs md:text-sm font-black uppercase tracking-[0.25em] text-blue-100">Attendance Management</p>
            <h1 className="mt-3 text-2xl md:text-4xl font-black tracking-tight">Attendance Dashboard</h1>
            <p className="mt-3 max-w-2xl text-xs md:text-sm leading-6 text-blue-50">Normal, QR, selfie, GPS and biometric attendance.</p>
          </div>
          <button onClick={boot} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 md:px-5 py-2.5 md:py-3 text-sm font-black text-white ring-1 ring-white/20 hover:bg-white/20"><RefreshCcw size={18} /> Refresh</button>
        </div>
      </section>

      {message && (
        <div className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 md:px-5 py-3 md:py-4 text-xs md:text-sm font-black text-blue-700">
          <span>{message}</span>
          <button onClick={() => setMessage("")}><X size={18} /></button>
        </div>
      )}

      {noEmployee && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 md:px-5 py-4 text-sm font-black text-amber-800">
          <AlertTriangle size={20} />
          <span>Your account is not linked to an employee profile. Contact HR to set up your employee record.</span>
        </div>
      )}

      <section className="grid gap-4 md:gap-5 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-2.5 md:p-3 text-blue-700"><Clock3 size={20} /></div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-950">Today Attendance</h2>
              <p className="text-xs md:text-sm font-semibold text-slate-500">Employee daily attendance status</p>
            </div>
          </div>
          <div className="mt-4 md:mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Stat label="Status" value={today?.status || "Not marked"} />
            <Stat label="Check In" value={today?.checkInTime ? new Date(today.checkInTime).toLocaleTimeString() : "-"} />
            <Stat label="Check Out" value={today?.checkOutTime ? new Date(today.checkOutTime).toLocaleTimeString() : "-"} />
            <Stat label="Work Mins" value={String(today?.totalWorkMins || 0)} />
          </div>
          <div className="mt-4 md:mt-6 grid grid-cols-2 gap-2 md:gap-3">
            <button onClick={normalCheckIn} disabled={loading || noEmployee} className="rounded-2xl bg-blue-600 px-4 md:px-5 py-3 md:py-4 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-60">Normal Check In</button>
            <button onClick={normalCheckOut} disabled={loading || noEmployee} className="rounded-2xl bg-slate-950 px-4 md:px-5 py-3 md:py-4 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60">Normal Check Out</button>
          </div>
          <div className="mt-3 md:mt-4 grid grid-cols-2 gap-2 md:gap-3">
            <button onClick={startBreak} disabled={loading || noEmployee} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 md:px-5 py-3 md:py-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"><TimerReset size={18} />Start Break</button>
            <button onClick={endBreak} disabled={loading || noEmployee} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 md:px-5 py-3 md:py-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"><TimerReset size={18} />End Break</button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-black text-slate-950">Current Employee</h2>
          <label className="mt-4 md:mt-5 block">
            <span className="mb-1.5 block text-xs md:text-sm font-bold text-slate-600">Employee ID</span>
            <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 md:px-4 py-2.5 md:py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" placeholder={noEmployee ? "No employee linked - enter manually" : "Auto-loaded from profile"} />
          </label>
          <button onClick={() => refreshToday()} disabled={loading || !employeeId} className="mt-3 md:mt-4 w-full rounded-2xl bg-blue-600 px-5 py-2.5 md:py-3 text-sm font-black text-white disabled:opacity-60">Load This Employee</button>
          {loading && <div className="mt-3 md:mt-4 flex items-center gap-2 text-sm font-bold text-slate-500"><Loader2 className="animate-spin" size={16} /> Processing...</div>}
        </div>
      </section>

      <section className="grid gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Panel title="QR Attendance" icon={QrCode}>
          <input value={qrToken} onChange={(e) => setQrToken(e.target.value)} placeholder="Paste QR token" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 md:px-4 py-2.5 md:py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" />
          <button onClick={qrCheckIn} disabled={loading || noEmployee} className="mt-3 w-full rounded-2xl bg-blue-600 px-5 py-2.5 md:py-3 text-sm font-black text-white disabled:opacity-60">QR Check In</button>
        </Panel>
        <Panel title="Selfie Attendance" icon={Camera}>
          <input value={selfieUrl} onChange={(e) => setSelfieUrl(e.target.value)} placeholder="Selfie URL" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 md:px-4 py-2.5 md:py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" />
          <button onClick={selfieCheckIn} disabled={loading || noEmployee} className="mt-3 w-full rounded-2xl bg-blue-600 px-5 py-2.5 md:py-3 text-sm font-black text-white disabled:opacity-60">Selfie Check In</button>
        </Panel>
        <Panel title="GPS Attendance" icon={MapPin}>
          <p className="text-xs md:text-sm font-semibold text-slate-500">Uses browser location permission.</p>
          <button onClick={gpsCheckIn} disabled={loading || noEmployee} className="mt-3 w-full rounded-2xl bg-blue-600 px-5 py-2.5 md:py-3 text-sm font-black text-white disabled:opacity-60">GPS Check In</button>
        </Panel>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-2.5 md:p-3 text-blue-700"><Fingerprint size={20} /></div>
          <div>
            <h2 className="text-lg md:text-xl font-black text-slate-950">Fingerprint / Biometric Attendance</h2>
            <p className="text-xs md:text-sm font-semibold text-slate-500">Works with biometric device enrollment.</p>
          </div>
        </div>
        <div className="mt-4 md:mt-5 grid gap-3 md:gap-4 md:grid-cols-2">
          <input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="Device ID" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 md:px-4 py-2.5 md:py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" />
          <input value={biometricUserId} onChange={(e) => setBiometricUserId(e.target.value)} placeholder="Biometric User ID" className="rounded-2xl border border-slate-200 bg-slate-50 px-3 md:px-4 py-2.5 md:py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" />
        </div>
        <button onClick={biometricCheckIn} disabled={loading || noEmployee} className="mt-3 md:mt-4 rounded-2xl bg-slate-950 px-5 py-2.5 md:py-3 text-sm font-black text-white disabled:opacity-60">Biometric Check In</button>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
        <h2 className="text-lg md:text-xl font-black text-slate-950">Attendance Report</h2>
        <div className="mt-4 md:mt-5 grid gap-3">
          {report.length === 0 && <p className="py-6 text-center text-sm font-bold text-slate-400">No attendance records found.</p>}
          {report.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between md:gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900">{item.employee?.user?.name || item.employeeId}</p>
                    <p className="text-xs text-slate-500">{new Date(item.attendanceDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="mt-3 md:mt-0 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-black text-blue-700">{item.status}</span>
                  <span className="text-xs font-bold text-slate-600">In: {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString() : "—"}</span>
                  <span className="text-xs font-bold text-slate-600">Out: {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString() : "—"}</span>
                  <span className="text-xs font-bold text-slate-700">{item.totalWorkMins} min</span>
                  <span className="text-[10px] text-slate-400">{item.checkInMethod || "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 md:p-4">
      <p className="text-[10px] md:text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 md:mt-2 text-xs md:text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
      <div className="mb-4 md:mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-blue-50 p-2.5 md:p-3 text-blue-700"><Icon size={20} /></div>
        <h2 className="text-base md:text-lg font-black text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}
