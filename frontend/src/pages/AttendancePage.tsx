import { useEffect, useState } from "react";
import {
  Camera,
  Clock3,
  Fingerprint,
  Loader2,
  MapPin,
  QrCode,
  RefreshCcw,
  TimerReset,
} from "lucide-react";
import { apiClient } from "../api/client";
import type { AttendanceRecord } from "../types/attendance";

function AttendancePage() {
  const [today, setToday] = useState<AttendanceRecord | null>(null);
  const [report, setReport] = useState<AttendanceRecord[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [selfieUrl, setSelfieUrl] = useState("https://example.com/selfie.jpg");
  const [deviceId, setDeviceId] = useState("");
  const [biometricUserId, setBiometricUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadEmployeeId() {
    const response = await apiClient.get("/employees");
    const firstEmployee = response.data.data?.[0];

    if (firstEmployee?.id) {
      setEmployeeId(firstEmployee.id);
      return firstEmployee.id;
    }

    return "";
  }

  async function loadToday(id?: string) {
    const finalEmployeeId = id || employeeId;
    if (!finalEmployeeId) return;

    const response = await apiClient.get(
      `/attendance/today?employeeId=${finalEmployeeId}`
    );

    setToday(response.data.data);
  }

  async function loadReport() {
    const response = await apiClient.get("/attendance/report");
    setReport(response.data.data || []);
  }

  async function boot() {
    setLoading(true);
    try {
      const id = await loadEmployeeId();
      await loadToday(id);
      await loadReport();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
  }, []);

  async function runAction(action: () => Promise<any>, successText: string) {
    setLoading(true);
    setMessage("");

    try {
      await action();
      setMessage(successText);
      await loadToday();
      await loadReport();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  }

  function normalCheckIn() {
    return runAction(
      () =>
        apiClient.post("/attendance/check-in", {
          employeeId,
          method: "NORMAL",
        }),
      "Normal check-in successful"
    );
  }

  function normalCheckOut() {
    return runAction(
      () =>
        apiClient.post("/attendance/check-out", {
          employeeId,
          method: "NORMAL",
        }),
      "Normal check-out successful"
    );
  }

  function qrCheckIn() {
    return runAction(
      () =>
        apiClient.post("/attendance/qr/check-in", {
          employeeId,
          qrToken,
        }),
      "QR check-in successful"
    );
  }

  function selfieCheckIn() {
    return runAction(
      () =>
        apiClient.post("/attendance/selfie/check-in", {
          employeeId,
          selfieUrl,
        }),
      "Selfie check-in successful"
    );
  }

  function gpsCheckIn() {
    setLoading(true);
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await apiClient.post("/attendance/gps/check-in", {
            employeeId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyM: position.coords.accuracy,
          });

          setMessage("GPS check-in successful");
          await loadToday();
          await loadReport();
        } catch (err: any) {
          setMessage(err?.response?.data?.message || "GPS check-in failed");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setMessage("Location permission denied");
        setLoading(false);
      }
    );
  }

  function biometricCheckIn() {
    return runAction(
      () =>
        apiClient.post("/attendance/biometric/attendance", {
          deviceId,
          biometricUserId,
          action: "CHECK_IN",
          rawPayload: {
            source: "frontend-test",
          },
        }),
      "Biometric check-in successful"
    );
  }

  function startBreak() {
    return runAction(
      () =>
        apiClient.post("/attendance/break/start", {
          employeeId,
          notes: "Break from frontend",
        }),
      "Break started successfully"
    );
  }

  function endBreak() {
    return runAction(
      () =>
        apiClient.post("/attendance/break/end", {
          employeeId,
        }),
      "Break ended successfully"
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 p-8 text-white shadow-2xl shadow-blue-100">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-100">
              Attendance Management
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Advanced Attendance Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
              Normal, QR, selfie, GPS and biometric attendance are connected
              with backend APIs.
            </p>
          </div>

          <button
            onClick={boot}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/20 hover:bg-white/20"
          >
            <RefreshCcw size={18} />
            Refresh
          </button>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-black text-blue-700">
          {message}
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <Clock3 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Today Attendance
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Employee daily attendance status
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <Stat label="Status" value={today?.status || "Not marked"} />
            <Stat
              label="Check In"
              value={
                today?.checkInTime
                  ? new Date(today.checkInTime).toLocaleTimeString()
                  : "-"
              }
            />
            <Stat
              label="Check Out"
              value={
                today?.checkOutTime
                  ? new Date(today.checkOutTime).toLocaleTimeString()
                  : "-"
              }
            />
            <Stat label="Work Mins" value={String(today?.totalWorkMins || 0)} />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              onClick={normalCheckIn}
              disabled={loading}
              className="rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-60"
            >
              Normal Check In
            </button>

            <button
              onClick={normalCheckOut}
              disabled={loading}
              className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Normal Check Out
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button
              onClick={startBreak}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <TimerReset size={18} />
              Start Break
            </button>

            <button
              onClick={endBreak}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <TimerReset size={18} />
              End Break
            </button>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Current Employee
          </h2>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-bold text-slate-600">
              Employee ID
            </span>
            <input
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white"
            />
          </label>

          <button
            onClick={() => loadToday()}
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            Load This Employee
          </button>

          {loading && (
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500">
              <Loader2 className="animate-spin" size={16} />
              Processing...
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Panel title="QR Attendance" icon={QrCode}>
          <input
            value={qrToken}
            onChange={(event) => setQrToken(event.target.value)}
            placeholder="Paste QR token"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white"
          />

          <button
            onClick={qrCheckIn}
            disabled={loading}
            className="mt-3 w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            QR Check In
          </button>
        </Panel>

        <Panel title="Selfie Attendance" icon={Camera}>
          <input
            value={selfieUrl}
            onChange={(event) => setSelfieUrl(event.target.value)}
            placeholder="Selfie URL"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white"
          />

          <button
            onClick={selfieCheckIn}
            disabled={loading}
            className="mt-3 w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            Selfie Check In
          </button>
        </Panel>

        <Panel title="GPS Attendance" icon={MapPin}>
          <p className="text-sm font-semibold text-slate-500">
            Uses browser location permission.
          </p>

          <button
            onClick={gpsCheckIn}
            disabled={loading}
            className="mt-3 w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            GPS Check In
          </button>
        </Panel>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
            <Fingerprint size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Fingerprint / Biometric Attendance
            </h2>
            <p className="text-sm font-semibold text-slate-500">
              Works with biometric device enrollment from backend.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            placeholder="Device ID"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white"
          />

          <input
            value={biometricUserId}
            onChange={(event) => setBiometricUserId(event.target.value)}
            placeholder="Biometric User ID"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white"
          />
        </div>

        <button
          onClick={biometricCheckIn}
          disabled={loading}
          className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          Biometric Check In
        </button>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">
          Attendance Report
        </h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                <th className="py-3">Date</th>
                <th className="py-3">Employee</th>
                <th className="py-3">Status</th>
                <th className="py-3">Check In</th>
                <th className="py-3">Check Out</th>
                <th className="py-3">Method</th>
                <th className="py-3">Work Mins</th>
              </tr>
            </thead>

            <tbody>
              {report.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-4 font-bold text-slate-700">
                    {new Date(item.attendanceDate).toLocaleDateString()}
                  </td>
                  <td className="py-4 font-bold text-slate-700">
                    {item.employee?.user?.name || item.employeeId}
                  </td>
                  <td className="py-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 text-slate-600">
                    {item.checkInTime
                      ? new Date(item.checkInTime).toLocaleTimeString()
                      : "-"}
                  </td>
                  <td className="py-4 text-slate-600">
                    {item.checkOutTime
                      ? new Date(item.checkOutTime).toLocaleTimeString()
                      : "-"}
                  </td>
                  <td className="py-4 font-bold text-slate-600">
                    {item.checkInMethod || "-"}
                  </td>
                  <td className="py-4 font-bold text-slate-600">
                    {item.totalWorkMins}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
          <Icon size={22} />
        </div>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default AttendancePage;