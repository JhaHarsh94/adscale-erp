import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  Layers3,
  Loader2,
  Network,
  PlusCircle,
  RefreshCcw,
  Send,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiClient } from "../api/client";
import type { Employee } from "../types/employee";
import type {
  DepartmentRecord,
  DesignationRecord,
  TeamRecord,
} from "../types/organization";

type OrganizationView = "departments" | "designations" | "teams" | "structure";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white";

const teamRoles = ["TEAM_LEAD", "MEMBER", "INTERN", "FREELANCER"];

function OrganizationPage({ defaultView }: { defaultView: OrganizationView }) {
  const [activeView, setActiveView] = useState<OrganizationView>(defaultView);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [designations, setDesignations] = useState<DesignationRecord[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [structure, setStructure] = useState<DepartmentRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [departmentForm, setDepartmentForm] = useState({
    name: "New Department",
    description: "Department responsibilities",
  });

  const [designationForm, setDesignationForm] = useState({
    name: "Executive",
    description: "Role designation",
    departmentId: "",
  });

  const [teamForm, setTeamForm] = useState({
    name: "Delivery Team",
    description: "Team description",
    departmentId: "",
  });

  const [memberForm, setMemberForm] = useState({
    teamId: "",
    employeeId: "",
    role: "MEMBER",
  });

  useEffect(() => {
    setActiveView(defaultView);
  }, [defaultView]);

  async function boot() {
    setLoading(true);
    setMessage("");

    try {
      const [
        departmentsResponse,
        designationsResponse,
        teamsResponse,
        structureResponse,
        employeesResponse,
      ] = await Promise.all([
        apiClient.get("/departments"),
        apiClient.get("/designations"),
        apiClient.get("/teams"),
        apiClient.get("/organization/structure"),
        apiClient.get("/employees"),
      ]);

      const nextDepartments = departmentsResponse.data.data || [];
      const nextTeams = teamsResponse.data.data || [];
      const nextEmployees = employeesResponse.data.data || [];
      const firstDepartmentId = nextDepartments[0]?.id || "";

      setDepartments(nextDepartments);
      setDesignations(designationsResponse.data.data || []);
      setTeams(nextTeams);
      setStructure(structureResponse.data.data || []);
      setEmployees(nextEmployees);

      setDesignationForm((current) => ({
        ...current,
        departmentId: current.departmentId || firstDepartmentId,
      }));
      setTeamForm((current) => ({
        ...current,
        departmentId: current.departmentId || firstDepartmentId,
      }));
      setMemberForm((current) => ({
        ...current,
        teamId: current.teamId || nextTeams[0]?.id || "",
        employeeId: current.employeeId || nextEmployees[0]?.id || "",
      }));
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Failed to load organization");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAction(action: () => Promise<unknown>, successText: string) {
    setLoading(true);
    setMessage("");

    try {
      await action();
      setMessage(successText);
      await boot();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Organization action failed");
    } finally {
      setLoading(false);
    }
  }

  function createDepartment() {
    return runAction(
      () => apiClient.post("/departments", departmentForm),
      "Department created successfully"
    );
  }

  function createDesignation() {
    return runAction(
      () => apiClient.post("/designations", designationForm),
      "Designation created successfully"
    );
  }

  function createTeam() {
    return runAction(
      () => apiClient.post("/teams", teamForm),
      "Team created successfully"
    );
  }

  function addTeamMember() {
    return runAction(
      () =>
        apiClient.post(`/teams/${memberForm.teamId}/members`, {
          employeeId: memberForm.employeeId,
          role: memberForm.role,
        }),
      "Team member added successfully"
    );
  }

  function deleteDepartment(id: string) {
    return runAction(() => apiClient.delete(`/departments/${id}`), "Department deleted");
  }
  function deleteDesignation(id: string) {
    return runAction(() => apiClient.delete(`/designations/${id}`), "Designation deleted");
  }
  function deleteTeam(id: string) {
    return runAction(() => apiClient.delete(`/teams/${id}`), "Team deleted");
  }

  const totalMembers = teams.reduce(
    (total, team) => total + (team.members?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 p-8 text-white shadow-2xl shadow-blue-100">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-100">
              Organization Management
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Departments, Teams & Reporting
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
              Company structure, designations, team creation and team
              membership are connected with backend APIs.
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
        <SummaryCard title="Departments" value={departments.length} icon={Building2} />
        <SummaryCard
          title="Designations"
          value={designations.length}
          icon={Network}
        />
        <SummaryCard title="Teams" value={teams.length} icon={Layers3} />
        <SummaryCard title="Team Members" value={totalMembers} icon={UsersRound} />
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-4">
          {[
            ["departments", "Departments"],
            ["designations", "Designations"],
            ["teams", "Teams"],
            ["structure", "Structure"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveView(key as OrganizationView)}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                activeView === key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                  : "bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-4">
        <Panel title="Create Department" icon={Building2}>
          <Field label="Name">
            <input
              value={departmentForm.name}
              onChange={(event) =>
                setDepartmentForm({ ...departmentForm, name: event.target.value })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Description">
            <textarea
              value={departmentForm.description}
              onChange={(event) =>
                setDepartmentForm({
                  ...departmentForm,
                  description: event.target.value,
                })
              }
              className={inputClass}
              rows={3}
            />
          </Field>
          <PrimaryButton onClick={createDepartment} disabled={loading}>
            <PlusCircle size={18} />
            Create
          </PrimaryButton>
        </Panel>

        <Panel title="Create Designation" icon={Network}>
          <Field label="Name">
            <input
              value={designationForm.name}
              onChange={(event) =>
                setDesignationForm({
                  ...designationForm,
                  name: event.target.value,
                })
              }
              className={inputClass}
            />
          </Field>
          <DepartmentSelect
            departments={departments}
            value={designationForm.departmentId}
            onChange={(value) =>
              setDesignationForm({ ...designationForm, departmentId: value })
            }
          />
          <Field label="Description">
            <textarea
              value={designationForm.description}
              onChange={(event) =>
                setDesignationForm({
                  ...designationForm,
                  description: event.target.value,
                })
              }
              className={inputClass}
              rows={3}
            />
          </Field>
          <PrimaryButton
            onClick={createDesignation}
            disabled={loading || !designationForm.departmentId}
          >
            <PlusCircle size={18} />
            Create
          </PrimaryButton>
        </Panel>

        <Panel title="Create Team" icon={Layers3}>
          <Field label="Name">
            <input
              value={teamForm.name}
              onChange={(event) =>
                setTeamForm({ ...teamForm, name: event.target.value })
              }
              className={inputClass}
            />
          </Field>
          <DepartmentSelect
            departments={departments}
            value={teamForm.departmentId}
            onChange={(value) => setTeamForm({ ...teamForm, departmentId: value })}
          />
          <Field label="Description">
            <textarea
              value={teamForm.description}
              onChange={(event) =>
                setTeamForm({ ...teamForm, description: event.target.value })
              }
              className={inputClass}
              rows={3}
            />
          </Field>
          <PrimaryButton
            onClick={createTeam}
            disabled={loading || !teamForm.departmentId}
          >
            <PlusCircle size={18} />
            Create
          </PrimaryButton>
        </Panel>

        <Panel title="Add Team Member" icon={UserPlus}>
          <Field label="Team">
            <select
              value={memberForm.teamId}
              onChange={(event) =>
                setMemberForm({ ...memberForm, teamId: event.target.value })
              }
              className={inputClass}
            >
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Employee">
            <select
              value={memberForm.employeeId}
              onChange={(event) =>
                setMemberForm({ ...memberForm, employeeId: event.target.value })
              }
              className={inputClass}
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.user?.name || employee.employeeCode}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Role">
            <select
              value={memberForm.role}
              onChange={(event) =>
                setMemberForm({ ...memberForm, role: event.target.value })
              }
              className={inputClass}
            >
              {teamRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </Field>
          <PrimaryButton
            onClick={addTeamMember}
            disabled={loading || !memberForm.teamId || !memberForm.employeeId}
          >
            <Send size={18} />
            Add Member
          </PrimaryButton>
        </Panel>
      </section>

      {activeView === "departments" && (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-black text-slate-950">Departments</h2>
          <div className="mt-4 md:mt-5 grid gap-3">
            {departments.length === 0 && <p className="py-4 text-center text-sm font-bold text-slate-400">No departments found.</p>}
            {departments.map((department) => (
              <div key={department.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{department.name}</p>
                  <p className="text-xs text-slate-500 truncate">{department.description || "—"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-600">{department._count?.employees ?? 0} employees</p>
                </div>
                <button onClick={() => deleteDepartment(department.id)} className="rounded-xl border p-2 text-red-400 hover:bg-red-50 hover:text-red-600 shrink-0"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeView === "designations" && (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-black text-slate-950">Designations</h2>
          <div className="mt-4 md:mt-5 grid gap-3">
            {designations.length === 0 && <p className="py-4 text-center text-sm font-bold text-slate-400">No designations found.</p>}
            {designations.map((designation) => (
              <div key={designation.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{designation.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Dept: {designation.department?.name || "—"}</p>
                    <p className="text-xs text-slate-500 truncate">{designation.description || "—"}</p>
                    <p className="mt-1 text-xs font-bold text-slate-600">{designation._count?.employees ?? 0} employees</p>
                  </div>
                  <button onClick={() => deleteDesignation(designation.id)} className="rounded-xl border p-2 text-red-400 hover:bg-red-50 hover:text-red-600 shrink-0"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeView === "teams" && (
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
          <h2 className="text-lg md:text-xl font-black text-slate-950">Teams</h2>
          <div className="mt-4 md:mt-5 grid gap-3">
            {teams.length === 0 && <p className="py-4 text-center text-sm font-bold text-slate-400">No teams found.</p>}
            {teams.map((team) => {
              const lead = team.members?.find((m) => m.role === "TEAM_LEAD");
              return (
                <div key={team.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{team.name}</p>
                      <p className="text-xs text-slate-500 truncate">{team.description || "—"}</p>
                      <p className="mt-0.5 text-xs text-slate-500">Dept: {team.department?.name || "—"}</p>
                      <p className="text-xs font-bold text-slate-600">{team.members?.length || 0} members</p>
                      {lead && <p className="text-xs font-bold text-blue-600">Lead: {lead.employee?.user?.name}</p>}
                    </div>
                    <button onClick={() => deleteTeam(team.id)} className="rounded-xl border p-2 text-red-400 hover:bg-red-50 hover:text-red-600 shrink-0"><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {activeView === "structure" && (
        <section className="grid gap-5 lg:grid-cols-2">
          {structure.map((department) => (
            <div
              key={department.id}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    {department.name}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {department.description || "Department"}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  {department.employees?.length || 0} employees
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {(department.teams || []).map((team) => (
                  <div key={team.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-900">
                      {team.name}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {team.members?.length || 0} members
                    </p>
                  </div>
                ))}
                {!department.teams?.length && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    No teams assigned.
                  </div>
                )}
              </div>
            </div>
          ))}
          {!structure.length && (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
              No organization structure found.
            </div>
          )}
        </section>
      )}

      {loading && (
        <div className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-xl">
          <Loader2 className="animate-spin" size={16} />
          Processing
        </div>
      )}
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
      <div className="flex items-center justify-between gap-4">
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
    <label className="mb-4 block">
      <span className="mb-2 block text-sm font-bold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function DepartmentSelect({
  departments,
  value,
  onChange,
}: {
  departments: DepartmentRecord[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Department">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        <option value="">Select department</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
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

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export default OrganizationPage;
