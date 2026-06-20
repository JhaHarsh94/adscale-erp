import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { apiClient } from "../api/client";
import { saveAuth } from "../lib/auth";
import type { LoginResponse } from "../types/auth";

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@adscale.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      const token = response.data.data.token;
      const user = response.data.data.user;

      saveAuth(token, user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_35%),linear-gradient(135deg,#f8fafc,#eff6ff,#ffffff)] px-5 py-8">
      <section className="mx-auto grid min-h-[90vh] max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/70 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm backdrop-blur">
            <ShieldCheck size={18} />
            AdScale One ERP
          </div>

          <h1 className="mt-6 max-w-3xl text-5xl font-black leading-tight tracking-tight text-slate-950 md:text-7xl">
            Agency operations in one premium dashboard.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Manage teams, employees, departments, clients, projects, CRM,
            tickets, HR and reports from a secure role-based ERP system.
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {["Secure", "Role Based", "Scalable"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-blue-100 bg-white/80 p-4 text-center shadow-sm"
              >
                <p className="text-sm font-black text-slate-900">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-blue-100 bg-white/90 p-6 shadow-2xl shadow-blue-100 backdrop-blur md:p-8">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">
              Welcome Back
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Login to ERP
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Use your AdScale admin credentials.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Email Address
              </span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-400 focus-within:bg-white">
                <Mail className="text-slate-400" size={20} />
                <input
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@adscale.com"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">
                Password
              </span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-400 focus-within:bg-white">
                <Lock className="text-slate-400" size={20} />
                <input
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
            </label>

            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-xl shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Logging in..." : "Login to Dashboard"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;