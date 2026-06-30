import { useEffect, useState } from "react";
import { Plus, RefreshCcw, ShieldCheck } from "lucide-react";
import { apiClient } from "../api/client";

const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";

interface Role { id: string; name: string; }
interface Employee { id: string; employeeCode: string; }
interface AppUser { id: string; name: string; email: string; phone?: string | null; status: string; role: Role; employee?: Employee | null; createdAt: string; }

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", roleName: "" });

  async function load() {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get("/auth/users"),
        apiClient.get("/roles"),
      ]);
      setUsers(usersRes.data.data || []);
      setRoles(rolesRes.data.data || []);
      if (!form.roleName && rolesRes.data.data?.[0]) {
        setForm((prev) => ({ ...prev, roleName: rolesRes.data.data[0].name }));
      }
    } catch { setMessage("Failed to load users"); }
  }

  useEffect(() => { void load(); }, []);

  async function createUser() {
    if (!form.name || !form.email || !form.password || !form.roleName) {
      setMessage("All fields are required"); return;
    }
    try {
      await apiClient.post("/auth/admin-register", form);
      setMessage(`User ${form.name} created`);
      setShowForm(false);
      setForm({ name: "", email: "", phone: "", password: "", roleName: roles[0]?.name || "" });
      await load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Failed to create user");
    }
  }

  const cards = [
    { label: "Total Users", value: users.length, color: "text-blue-700" },
    { label: "Active", value: users.filter((u) => u.status === "ACTIVE").length, color: "text-green-600" },
    { label: "Admins", value: users.filter((u) => ["SUPER_ADMIN", "DIRECTOR", "OPERATIONS_MANAGER"].includes(u.role.name)).length, color: "text-purple-600" },
    { label: "Employees", value: users.filter((u) => u.role.name === "EMPLOYEE").length, color: "text-indigo-600" },
  ];

  return <div className="space-y-6">
    <section className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-8 text-white">
      <div className="flex justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.28em] text-blue-200">System Admin</p><h1 className="mt-3 text-4xl font-black">User Management</h1><p className="mt-2 text-sm text-blue-100">Create and manage all users across the ERP.</p></div>
        <button onClick={load} className="h-fit rounded-xl bg-white/10 p-3"><RefreshCcw /></button>
      </div>
    </section>

    {message && <div className="rounded-xl bg-blue-50 p-4 text-sm font-bold text-blue-800">{message}</div>}

    <section className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => <div key={card.label} className="rounded-2xl border bg-white p-4"><ShieldCheck className={card.color} size={20}/><p className="mt-3 text-xs font-black uppercase text-slate-400">{card.label}</p><p className={`mt-1 text-xl font-black ${card.color}`}>{card.value}</p></div>)}
    </section>

    <section className="rounded-2xl border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">All Users</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"><Plus size={17} />{showForm ? "Cancel" : "New User"}</button>
      </div>

      {showForm && <div className="mt-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <input className={field} placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={field} placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={field} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className={field} placeholder="Password (min 6 chars)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className={field} value={form.roleName} onChange={(e) => setForm({ ...form, roleName: e.target.value })}>
            {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <button onClick={createUser} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">Create User</button>
      </div>}

      <div className="mt-5 grid gap-3">
        {users.length === 0 && <p className="py-8 text-center text-sm font-bold text-slate-400">No users found</p>}
        {users.map((user) => (
          <div key={user.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex md:items-center md:justify-between md:gap-4">
            <div className="flex items-start gap-3 md:min-w-0 md:flex-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">{user.name.charAt(0)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0 md:gap-3">
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-black text-blue-700">{user.role.name}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${user.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>{user.status}</span>
              {user.employee?.employeeCode && <span className="text-xs font-bold text-slate-500">Code: {user.employee.employeeCode}</span>}
              <span className="text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>;
}
