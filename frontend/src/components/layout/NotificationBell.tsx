import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { apiClient } from "../../api/client";
import { connectSocket, disconnectSocket } from "../../lib/socket";
import { getUser } from "../../lib/auth";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const user = getUser();
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const [listRes, countRes] = await Promise.all([
        apiClient.get("/notifications"),
        apiClient.get("/notifications/unread-count"),
      ]);
      setNotifications(listRes.data.data || []);
      setUnread(countRes.data.data?.count || 0);
    } catch {}
  }

  useEffect(() => {
    if (!user?.id) return;
    load();
    const socket = connectSocket(user.id);
    socket.on("notification:new", (n: Notification) => {
      setNotifications((prev) => [n, ...prev]);
      setUnread((u) => u + 1);
    });
    socket.on("notification:updated", (data: { unreadCount: number }) => {
      setUnread(data.unreadCount);
    });
    return () => { socket.off("notification:new"); socket.off("notification:updated"); disconnectSocket(); };
  }, [user?.id]);

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAsRead(id: string) {
    await apiClient.put(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnread((u) => Math.max(0, u - 1));
  }

  async function markAllRead() {
    await apiClient.put("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  async function deleteNotification(id: string) {
    await apiClient.delete(`/notifications/${id}`);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnread((u) => {
      const wasUnread = notifications.find((n) => n.id === id)?.isRead === false;
      return wasUnread ? Math.max(0, u - 1) : u;
    });
  }

  const typeIcon: Record<string, string> = { INFO: "bg-blue-100 text-blue-600", SUCCESS: "bg-green-100 text-green-600", WARNING: "bg-amber-100 text-amber-600", ERROR: "bg-red-100 text-red-600" };

  return <div ref={ref} className="relative">
    <button onClick={() => setOpen(!open)} className="relative rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50">
      <Bell size={19} />
      {unread > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{unread > 9 ? "9+" : unread}</span>}
    </button>

    {open && <div className="absolute right-0 top-12 z-50 w-80 lg:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-black">Notifications</h3>
        {unread > 0 && <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-bold text-blue-600"><CheckCheck size={14} />Mark all read</button>}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 && <p className="px-5 py-8 text-center text-sm font-bold text-slate-400">No notifications</p>}
        {notifications.map((n) => <div key={n.id} className={`flex gap-3 border-b border-slate-50 px-5 py-4 ${!n.isRead ? "bg-blue-50/50" : ""}`}>
          <div className={`mt-0.5 h-8 w-8 shrink-0 rounded-xl flex items-center justify-center text-xs font-black ${typeIcon[n.type] || typeIcon.INFO}`}>
            {n.type[0] || "I"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">{n.title}</p>
            <p className="mt-0.5 text-xs text-slate-500 truncate">{n.message}</p>
            <p className="mt-1 text-[10px] font-bold text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
          </div>
          <div className="flex flex-col gap-1">
            {!n.isRead && <button onClick={() => markAsRead(n.id)} className="rounded-lg p-1 text-blue-500 hover:bg-blue-50"><CheckCheck size={14} /></button>}
            <button onClick={() => deleteNotification(n.id)} className="rounded-lg p-1 text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
          </div>
        </div>)}
      </div>
    </div>}
  </div>;
}
