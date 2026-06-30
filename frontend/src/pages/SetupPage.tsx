import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Rocket } from "lucide-react";
import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function SetupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("Admin");
  const [email, setEmail] = useState("admin@adscale.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "progress" | "done">("form");

  async function handleSetup() {
    if (!name || !email || !password) { setError("All fields are required"); return; }
    setLoading(true);
    setError("");
    setStep("progress");
    try {
      const res = await axios.post(`${API}/auth/setup`, { name, email, password });
      localStorage.setItem("adscale_token", res.data.data.token);
      localStorage.setItem("adscale_user", JSON.stringify(res.data.data.user));
      setStep("done");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Setup failed");
      setStep("form");
      setLoading(false);
    }
  }

  if (step === "done") {
    return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950">
      <div className="rounded-3xl bg-white p-10 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100"><Rocket className="text-green-600" size={32} /></div>
        <h1 className="mt-5 text-2xl font-black">System Ready!</h1>
        <p className="mt-2 text-sm text-slate-500">Redirecting to dashboard...</p>
        <Loader2 className="mx-auto mt-4 animate-spin text-blue-600" size={24} />
      </div>
    </div>;
  }

  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-4">
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100"><Rocket className="text-blue-600" size={28} /></div>
      <h1 className="mt-5 text-center text-2xl font-black">AdScale One ERP</h1>
      <p className="mt-1 text-center text-sm font-bold text-slate-400">First-time setup — create the admin account</p>

      {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">Admin Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500" />
        </div>
        <button onClick={handleSetup} disabled={loading} className="w-full rounded-xl bg-blue-700 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-60">
          {loading ? <><Loader2 className="inline animate-spin" size={16} /> Setting up...</> : "Initialize System"}
        </button>
        <p className="text-center text-xs font-bold text-slate-400">This will create all roles, permissions, and the first admin user.</p>
      </div>
    </div>
  </div>;
}
