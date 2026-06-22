import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function SetupGuard() {
  const [status, setStatus] = useState<"loading" | "setup" | "ready">("loading");

  useEffect(() => {
    axios.get(`${API}/auth/setup-status`)
      .then((res) => setStatus(res.data.data?.needsSetup ? "setup" : "ready"))
      .catch(() => setStatus("ready"));
  }, []);

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950">
      <Loader2 className="animate-spin text-white" size={32} />
    </div>;
  }

  if (status === "setup") return <Navigate to="/setup" replace />;
  return <Outlet />;
}
