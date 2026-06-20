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
} from "lucide-react";
import { apiClient } from "../api/client";
import type { Employee } from "../types/employee";

function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEmployees() {
      try {
        const response = await apiClient.get("/employees");
        setEmployees(response.data.data || []);
      } finally {
        setLoading(false);
      }
    }

    loadEmployees();
  }, []);

  const filteredEmployees = employees.filter((employee) => {
    const text = `${employee.user?.name} ${employee.user?.email} ${employee.employeeCode} ${employee.department?.name} ${employee.designation?.name}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 p-8 text-white shadow-2xl shadow-blue-100">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-100">
              Employee Management
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">
              Employee Directory
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">
              Manage employee profiles, departments, designations, skills,
              documents, salary details, and reporting structure.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/20">
            <p className="text-sm font-bold text-blue-100">Total Employees</p>
            <p className="mt-2 text-5xl font-black">
              {loading ? "..." : employees.length}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <UsersRound size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">
                All Employees
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Search and view employee master records
              </p>
            </div>
          </div>

          <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700">
            <UserRoundPlus size={18} />
            Add Employee
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-400 focus-within:bg-white">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, code, department..."
            className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none"
          />
        </div>
      </section>

      <section className="grid gap-5">
        {loading ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
            Loading employees...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
            No employees found.
          </div>
        ) : (
          filteredEmployees.map((employee) => (
            <Link
              to={`/employees/${employee.id}`}
              key={employee.id}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white">
                    {employee.user?.name?.charAt(0) || "E"}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">
                        {employee.user?.name}
                      </h3>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        {employee.employmentStatus}
                      </span>
                    </div>

                    <p className="mt-1 text-sm font-bold text-slate-500">
                      {employee.employeeCode}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Mail size={14} />
                        {employee.user?.email}
                      </span>

                      {employee.user?.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={14} />
                          {employee.user.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3 lg:min-w-[520px]">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Department
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {employee.department?.name || "Not assigned"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Designation
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {employee.designation?.name || "Not assigned"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Salary
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      ₹{employee.salary || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  <BadgeCheck size={13} />
                  {employee.user?.role?.name || "Role"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  <BriefcaseBusiness size={13} />
                  View Profile
                </span>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

export default EmployeesPage;