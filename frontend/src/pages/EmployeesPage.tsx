import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Mail,
  Phone,
  Search,
  UserRoundPlus,
  UsersRound,
  X,
  Loader2,
} from "lucide-react";
import { apiClient } from "../api/client";
import type { Employee } from "../types/employee";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [designations, setDesignations] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", roleId: "",
    employeeCode: "", departmentId: "", designationId: "",
    joiningDate: "", salary: "", employmentStatus: "ACTIVE",
  });

  useEffect(() => {
    async function load() {
      try {
        const [empRes, roleRes, deptRes, desigRes] = await Promise.all([
          apiClient.get("/employees"),
          apiClient.get("/roles"),
          apiClient.get("/departments"),
          apiClient.get("/designations"),
        ]);
        setEmployees(empRes.data.data || []);
        setRoles(roleRes.data.data || []);
        setDepartments(deptRes.data.data || []);
        setDesignations(desigRes.data.data || []);
      } catch { setMessage("Failed to load data"); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.roleId || !form.employeeCode) {
      setMessage("Name, email, password, role, and employee code are required");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const res = await apiClient.post("/employees", form);
      setEmployees([res.data.data, ...employees]);
      setShowModal(false);
      setForm({ name: "", email: "", phone: "", password: "", roleId: "", employeeCode: "", departmentId: "", designationId: "", joiningDate: "", salary: "", employmentStatus: "ACTIVE" });
      setMessage("Employee created successfully");
    } catch (err: any) { setMessage(err?.response?.data?.message || "Failed to create employee"); }
    finally { setSaving(false); }
  }

  const filtered = employees.filter((e) => {
    const t = `${e.user?.name} ${e.user?.email} ${e.employeeCode} ${e.department?.name} ${e.designation?.name}`.toLowerCase();
    return t.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 p-6 md:p-8 text-white">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs md:text-sm font-black uppercase tracking-[0.25em] text-blue-100">Employee Management</p>
            <h1 className="mt-3 text-2xl md:text-4xl font-black tracking-tight">Employee Directory</h1>
            <p className="mt-3 max-w-2xl text-xs md:text-sm leading-6 text-blue-50">Manage employee profiles, departments, designations, skills, documents, salary details, and reporting structure.</p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 md:p-5 ring-1 ring-white/20">
            <p className="text-xs md:text-sm font-bold text-blue-100">Total Employees</p>
            <p className="mt-2 text-3xl md:text-5xl font-black">{loading ? "..." : employees.length}</p>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-black text-blue-700 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage("")}><X size={18} /></button>
        </div>
      )}

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-2.5 md:p-3 text-blue-700"><UsersRound size={20} /></div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-950">All Employees</h2>
              <p className="text-xs md:text-sm font-semibold text-slate-500">Search and view employee master records</p>
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 md:px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700">
            <UserRoundPlus size={18} /> Add Employee
          </button>
        </div>
        <div className="mt-4 md:mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-400 focus-within:bg-white">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, code, department..." className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none" />
        </div>
      </section>

      <section className="grid gap-4 md:gap-5">
        {loading ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Loading employees...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">No employees found.</div>
        ) : filtered.map((employee) => (
          <Link to={`/employees/${employee.id}`} key={employee.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-4 md:p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-base md:text-lg font-black text-white">
                  {employee.user?.name?.charAt(0) || "E"}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base md:text-lg font-black text-slate-950 truncate">{employee.user?.name}</h3>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-black text-blue-700">{employee.employmentStatus}</span>
                  </div>
                  <p className="mt-1 text-xs md:text-sm font-bold text-slate-500">{employee.employeeCode}</p>
                  <div className="mt-2 md:mt-3 flex flex-wrap gap-2 md:gap-3 text-xs font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1"><Mail size={13} /><span className="truncate max-w-[150px] md:max-w-none">{employee.user?.email}</span></span>
                    {employee.user?.phone && <span className="inline-flex items-center gap-1"><Phone size={13} />{employee.user.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 md:gap-3 lg:min-w-[480px]">
                <div className="rounded-2xl bg-slate-50 p-2.5 md:p-4">
                  <p className="text-[10px] md:text-xs font-black uppercase text-slate-400">Department</p>
                  <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-black text-slate-900 truncate">{employee.department?.name || "N/A"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-2.5 md:p-4">
                  <p className="text-[10px] md:text-xs font-black uppercase text-slate-400">Designation</p>
                  <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-black text-slate-900 truncate">{employee.designation?.name || "N/A"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-2.5 md:p-4">
                  <p className="text-[10px] md:text-xs font-black uppercase text-slate-400">Salary</p>
                  <p className="mt-0.5 md:mt-1 text-xs md:text-sm font-black text-slate-900">₹{employee.salary || 0}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 md:mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600"><BadgeCheck size={13} />{employee.user?.role?.name || "Role"}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600"><BriefcaseBusiness size={13} />View Profile</span>
            </div>
          </Link>
        ))}
      </section>

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 pt-8 md:pt-16">
          <div className="relative w-full max-w-2xl rounded-2xl border bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-black">Add Employee</h2>
              <button onClick={() => setShowModal(false)} className="rounded-xl border p-2 hover:bg-slate-50"><X size={18} /></button>
            </div>
            <form onSubmit={createEmployee} className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Full Name *</label>
                  <input required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Email *</label>
                  <input required type="email" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Phone</label>
                  <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Password *</label>
                  <input required type="password" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Employee Code *</label>
                  <input required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Role *</label>
                  <select required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                    <option value="">Select role</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Department</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                    <option value="">Select department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Designation</label>
                  <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" value={form.designationId} onChange={(e) => setForm({ ...form, designationId: e.target.value })}>
                    <option value="">Select designation</option>
                    {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Joining Date</label>
                  <input type="date" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-600">Salary</label>
                  <input type="number" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="rounded-xl border px-5 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? "Saving..." : "Create Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
