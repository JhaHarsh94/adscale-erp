import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Loader2,
  PlusCircle,
  RefreshCcw,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiClient } from "../api/client";
import type {
  LeaveBalance,
  LeaveDashboard,
  LeaveRequest,
  LeaveType,
} from "../types/leave";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white";

function LeaveManagementPage() {
  const [dashboard, setDashboard] = useState<LeaveDashboard | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("2026-06-25");
  const [endDate, setEndDate] = useState("2026-06-26");
  const [dayType, setDayType] = useState("FULL_DAY");
  const [reason, setReason] = useState("Personal work");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadEmployeeId() {
    const response = await apiClient.get("/employees");
    const firstEmployee = response.data.data?.[0];

    if (firstEmployee?.id) {
      setEmployeeId(firstEmployee.id);
      return firstEmployee.id;
    }

    return "";
  }

  async function loadDashboard() {
    const response = await apiClient.get("/leaves/dashboard");
    setDashboard(response.data.data);
  }

  async function loadLeaveTypes() {
    const response = await apiClient.get("/leaves/types");
    const types: LeaveType[] = response.data.data || [];

    setLeaveTypes(types);

    if (types.length > 0) {
      setLeaveTypeId((current) => current || types[0].id);
    }

    return types;
  }

  async function loadLeaveRequests() {
    const response = await apiClient.get("/leaves/requests");
    setLeaveRequests(response.data.data || []);
  }

  async function loadLeaveBalances(id?: string) {
    const finalEmployeeId = id || employeeId;

    const response = await apiClient.get(
      finalEmployeeId
        ? `/leaves/balances?employeeId=${finalEmployeeId}`
        : "/leaves/balances"
    );

    setLeaveBalances(response.data.data || []);
  }

  async function boot() {
    setLoading(true);
    setMessage("");

    try {
      const id = await loadEmployeeId();
      await loadDashboard();
      await loadLeaveTypes();
      await loadLeaveRequests();
      await loadLeaveBalances(id);
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Failed to load leave data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAction(action: () => Promise<any>, successText: string) {
    setLoading(true);
    setMessage("");

    try {
      await action();
      setMessage(successText);
      await loadDashboard();
      await loadLeaveTypes();
      await loadLeaveRequests();
      await loadLeaveBalances();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  }

  function createDefaultLeaveType() {
    return runAction(
      () =>
        apiClient.post("/leaves/types", {
          name: "Casual Leave",
          code: "CL",
          annualQuota: 12,
          isPaid: true,
        }),
      "Leave type created successfully"
    );
  }

  function createDefaultBalance() {
    return runAction(
      () =>
        apiClient.post("/leaves/balances", {
          employeeId,
          leaveTypeId,
          year: 2026,
          openingBalance: 12,
          credited: 12,
        }),
      "Leave balance saved successfully"
    );
  }

  function applyLeave() {
    return runAction(
      () =>
        apiClient.post("/leaves/requests", {
          employeeId,
          leaveTypeId,
          startDate,
          endDate,
          dayType,
          reason,
        }),
      "Leave request applied successfully"
    );
  }

  function teamLeadApprove(id: string) {
    return runAction(
      () =>
        apiClient.put(`/leaves/requests/${id}/team-lead-approval`, {
          action: "APPROVED",
          remarks: "Approved by Team Lead from frontend",
        }),
      "Leave approved by Team Lead"
    );
  }

  function teamLeadReject(id: string) {
    return runAction(
      () =>
        apiClient.put(`/leaves/requests/${id}/team-lead-approval`, {
          action: "REJECTED",
          remarks: "Rejected by Team Lead from frontend",
        }),
      "Leave rejected by Team Lead"
    );
  }

  function hrApprove(id: string) {
    return runAction(
      () =>
        apiClient.put(`/leaves/requests/${id}/hr-approval`, {
          action: "APPROVED",
          remarks: "Approved by HR from frontend",
        }),
      "Leave approved by HR"
    );
  }

  function hrReject(id: string) {
    return runAction(
      () =>
        apiClient.put(`/leaves/requests/${id}/hr-approval`, {
          action: "REJECTED",
          remarks: "Rejected by HR from frontend",
        }),
      "Leave rejected by HR"
    );
  }

  function cancelLeave(id: string) {
    return runAction(
      () =>
        apiClient.put(`/leaves/requests/${id}/cancel`, {
          remarks: "Cancelled from frontend",
        }),
      "Leave cancelled successfully"
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 p-8 text-white shadow-2xl shadow-blue-100">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-100">
              Leave Management
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Leave Requests & Approvals
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
              Employee leave apply, leave balance, Team Lead approval, HR
              approval, leave history and dashboard are connected with backend
              APIs.
            </p>
          </div>

          <button
            onClick={boot}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/20 hover:bg-white/20 disabled:opacity-60"
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

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Requests"
          value={dashboard?.totalLeaveRequests ?? 0}
          icon={ClipboardList}
        />
        <SummaryCard
          title="Pending"
          value={dashboard?.pendingRequests ?? 0}
          icon={CalendarCheck}
        />
        <SummaryCard
          title="Approved"
          value={dashboard?.approvedRequests ?? 0}
          icon={CheckCircle2}
        />
        <SummaryCard
          title="Rejected"
          value={dashboard?.rejectedRequests ?? 0}
          icon={XCircle}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <Send size={22} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-950">
                Apply Leave
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Create new employee leave request
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Employee ID">
              <input
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Leave Type">
              <select
                value={leaveTypeId}
                onChange={(event) => setLeaveTypeId(event.target.value)}
                className={inputClass}
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Start Date">
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="End Date">
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Day Type">
              <select
                value={dayType}
                onChange={(event) => setDayType(event.target.value)}
                className={inputClass}
              >
                <option value="FULL_DAY">Full Day</option>
                <option value="HALF_DAY">Half Day</option>
              </select>
            </Field>

            <Field label="Reason">
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <button
            onClick={applyLeave}
            disabled={loading || !employeeId || !leaveTypeId}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Send size={18} />
            )}
            Apply Leave
          </button>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Quick Setup</h2>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Use this only if leave type or balance does not exist.
          </p>

          <button
            onClick={createDefaultLeaveType}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <PlusCircle size={18} />
            Create Casual Leave
          </button>

          <button
            onClick={createDefaultBalance}
            disabled={loading || !employeeId || !leaveTypeId}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <ShieldCheck size={18} />
            Set Leave Balance
          </button>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Panel title="Leave Types">
          {leaveTypes.length ? (
            leaveTypes.map((type) => (
              <div key={type.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">
                  {type.name}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {type.code} • Annual Quota: {type.annualQuota}
                </p>
              </div>
            ))
          ) : (
            <EmptyText text="No leave types found." />
          )}
        </Panel>

        <Panel title="Leave Balances">
          {leaveBalances.length ? (
            leaveBalances.map((balance) => (
              <div key={balance.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">
                  {balance.leaveType?.name || "Leave Type"}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Remaining: {balance.remaining} • Used: {balance.used} •
                  Pending: {balance.pending}
                </p>
              </div>
            ))
          ) : (
            <EmptyText text="No leave balances found." />
          )}
        </Panel>

        <Panel title="Approval Flow">
          <div className="space-y-3">
            {[
              "Employee Applies",
              "Team Lead Approval",
              "HR Approval",
              "Approved / Rejected",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                  {index + 1}
                </div>

                <p className="text-sm font-black text-slate-800">{item}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Leave Requests</h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                <th className="py-3">Employee</th>
                <th className="py-3">Leave Type</th>
                <th className="py-3">Dates</th>
                <th className="py-3">Days</th>
                <th className="py-3">Status</th>
                <th className="py-3">Reason</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {leaveRequests.map((request) => (
                <tr key={request.id} className="border-b border-slate-100">
                  <td className="py-4 font-bold text-slate-700">
                    {request.employee?.user?.name || request.employeeId}
                  </td>

                  <td className="py-4 font-bold text-slate-700">
                    {request.leaveType?.name || request.leaveTypeId}
                  </td>

                  <td className="py-4 text-slate-600">
                    {new Date(request.startDate).toLocaleDateString()} -{" "}
                    {new Date(request.endDate).toLocaleDateString()}
                  </td>

                  <td className="py-4 font-bold text-slate-700">
                    {request.totalDays}
                  </td>

                  <td className="py-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      {request.status}
                    </span>
                  </td>

                  <td className="py-4 text-slate-600">
                    {request.reason || "-"}
                  </td>

                  <td className="py-4">
                    <div className="flex flex-wrap gap-2">
                      {request.status === "PENDING" && (
                        <>
                          <ActionButton
                            label="TL Approve"
                            onClick={() => teamLeadApprove(request.id)}
                          />

                          <ActionButton
                            label="TL Reject"
                            danger
                            onClick={() => teamLeadReject(request.id)}
                          />
                        </>
                      )}

                      {request.status === "TEAM_LEAD_APPROVED" && (
                        <>
                          <ActionButton
                            label="HR Approve"
                            onClick={() => hrApprove(request.id)}
                          />

                          <ActionButton
                            label="HR Reject"
                            danger
                            onClick={() => hrReject(request.id)}
                          />
                        </>
                      )}

                      {(request.status === "PENDING" ||
                        request.status === "TEAM_LEAD_APPROVED") && (
                        <ActionButton
                          label="Cancel"
                          dark
                          onClick={() => cancelLeave(request.id)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!leaveRequests.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-sm font-bold text-slate-500"
                  >
                    No leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
          <Icon size={24} />
        </div>

        <p className="text-4xl font-black text-slate-950">{value}</p>
      </div>

      <p className="mt-5 text-sm font-black text-slate-900">{title}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-600">
        {label}
      </span>

      {children}
    </label>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-black text-slate-950">{title}</h2>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  danger,
  dark,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  dark?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-xs font-black text-white ${
        danger ? "bg-red-600" : dark ? "bg-slate-950" : "bg-blue-600"
      }`}
    >
      {label}
    </button>
  );
}

export default LeaveManagementPage;