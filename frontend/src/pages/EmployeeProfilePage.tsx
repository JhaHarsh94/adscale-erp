import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeIndianRupee,
  BriefcaseBusiness,
  FileText,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { apiClient } from "../api/client";
import type { EmployeeProfile } from "../types/employee";

function EmployeeProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await apiClient.get(`/employees/${id}/profile`);
        setProfile(response.data.data);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
        Loading employee profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-bold text-slate-500">Profile not found.</p>
        <Link
          to="/employees"
          className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white"
        >
          Back to Employees
        </Link>
      </div>
    );
  }

  const currentSalary = profile.salaryDetails?.find((item) => item.isCurrent);

  return (
    <div className="space-y-6">
      <Link
        to="/employees"
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <ArrowLeft size={16} />
        Back to Employees
      </Link>

      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 p-8 text-white shadow-2xl shadow-blue-100">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/15 text-4xl font-black ring-1 ring-white/25">
              {profile.user?.name?.charAt(0) || "E"}
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-blue-100">
                Employee Profile
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight">
                {profile.user?.name}
              </h1>
              <p className="mt-2 text-sm font-bold text-blue-100">
                {profile.employeeCode} • {profile.employmentStatus}
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/20">
            <p className="text-sm font-bold text-blue-100">Current Salary</p>
            <p className="mt-2 text-4xl font-black">
              ₹{currentSalary?.netSalary || profile.salary || 0}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <UserRound size={22} />
            </div>
            <h2 className="text-xl font-black text-slate-950">
              Basic Information
            </h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InfoItem label="Email" value={profile.user?.email} icon={Mail} />
            <InfoItem label="Phone" value={profile.user?.phone || "Not added"} icon={Phone} />
            <InfoItem label="Department" value={profile.department?.name || "Not assigned"} icon={BriefcaseBusiness} />
            <InfoItem label="Designation" value={profile.designation?.name || "Not assigned"} icon={ShieldCheck} />
            <InfoItem label="Role" value={profile.user?.role?.name || "Not assigned"} icon={ShieldCheck} />
            <InfoItem label="Manager" value={profile.manager?.user?.name || "Top level / Not assigned"} icon={UserRound} />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Quick Stats</h2>

          <div className="mt-5 space-y-4">
            <Stat label="Documents" value={profile.documents?.length || 0} />
            <Stat label="Skills" value={profile.employeeSkills?.length || 0} />
            <Stat label="Salary Records" value={profile.salaryDetails?.length || 0} />
            <Stat label="Subordinates" value={profile.subordinates?.length || 0} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Panel title="Documents" icon={FileText}>
          {profile.documents?.length ? (
            profile.documents.map((document) => (
              <div key={document.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">
                  {document.name}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {document.type}
                </p>
              </div>
            ))
          ) : (
            <EmptyText text="No documents added." />
          )}
        </Panel>

        <Panel title="Skills" icon={Sparkles}>
          {profile.employeeSkills?.length ? (
            profile.employeeSkills.map((skill) => (
              <div key={skill.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">
                  {skill.skillName}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {skill.level} • {skill.yearsOfExperience || 0} years
                </p>
              </div>
            ))
          ) : (
            <EmptyText text="No skills added." />
          )}
        </Panel>

        <Panel title="Salary Details" icon={BadgeIndianRupee}>
          {profile.salaryDetails?.length ? (
            profile.salaryDetails.map((salary) => (
              <div key={salary.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">
                  ₹{salary.netSalary}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Basic ₹{salary.basicSalary} •{" "}
                  {salary.isCurrent ? "Current" : "Old"}
                </p>
              </div>
            ))
          ) : (
            <EmptyText text="No salary records added." />
          )}
        </Panel>
      </section>
    </div>
  );
}

function InfoItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-blue-700">
        <Icon size={16} />
        <p className="text-xs font-black uppercase">{label}</p>
      </div>
      <p className="mt-2 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-3">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="text-sm font-black text-slate-950">{value}</span>
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
          <Icon size={20} />
        </div>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
      </div>

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

export default EmployeeProfilePage;