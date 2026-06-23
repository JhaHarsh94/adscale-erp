import { useEffect, useRef, useState } from "react";
import { MessageCircle, Plus, Send, Users, ChevronLeft, MessageSquare } from "lucide-react";
import { apiClient } from "../api/client";
import { connectSocket } from "../lib/socket";
import { getUser } from "../lib/auth";
import type { ChatRoom, ChatUser, Message } from "../types/chat";

const field = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500";
const user = getUser();

export default function ChatPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadRooms() {
    try { const res = await apiClient.get("/chat/rooms"); setRooms(res.data.data || []); } catch {}
  }

  async function loadMessages(roomId: string) {
    try { const res = await apiClient.get(`/chat/rooms/${roomId}/messages`); setMessages(res.data.data?.messages || []); } catch { setMessages([]); }
  }

  async function loadUsers() {
    try { const res = await apiClient.get("/chat/users"); setChatUsers(res.data.data || []); } catch {}
  }

  useEffect(() => { void loadRooms(); void loadUsers(); }, []);

  /* Socket.IO setup */
  useEffect(() => {
    if (!user?.id) return;
    const socket = connectSocket(user.id);

    socket.on("chat:message", (msg: Message) => {
      if (msg.chatRoomId === activeRoom?.id) {
        setMessages((prev) => [...prev, msg]);
      }
      loadRooms();
    });

    socket.on("chat:typing", (data: { roomId: string; userId: string; name: string }) => {
      if (data.roomId === activeRoom?.id && data.userId !== user.id) {
        setTypingUsers((prev) => ({ ...prev, [data.userId]: data.name }));
        setTimeout(() => setTypingUsers((prev) => { const next = { ...prev }; delete next[data.userId]; return next; }), 3000);
      }
    });

    if (activeRoom) socket.emit("chat:join", activeRoom.id);

    return () => {
      socket.off("chat:message");
      socket.off("chat:typing");
      if (activeRoom) socket.emit("chat:leave", activeRoom.id);
    };
  }, [activeRoom?.id, user?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function selectRoom(room: ChatRoom) {
    setActiveRoom(room);
    setSidebarOpen(false);
    loadMessages(room.id);
    apiClient.post(`/chat/rooms/${room.id}/read`).catch(() => {});
  }

  async function sendMessage() {
    if (!input.trim() || !activeRoom) return;
    try {
      await apiClient.post(`/chat/rooms/${activeRoom.id}/messages`, { body: input });
      setInput("");
    } catch {}
  }

  async function startDirectChat(targetUserId: string) {
    try {
      const res = await apiClient.post("/chat/rooms/direct", { userId: targetUserId });
      setShowNewChat(false);
      await loadRooms();
      selectRoom(res.data.data);
    } catch {}
  }

  async function createGroup() {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    try {
      const res = await apiClient.post("/chat/rooms/group", { name: groupName, userIds: selectedUsers });
      setShowNewChat(false);
      setGroupName("");
      setSelectedUsers([]);
      await loadRooms();
      selectRoom(res.data.data);
    } catch {}
  }

  function handleTyping() {
    if (!activeRoom || !user) return;
    const socket = connectSocket(user.id);
    socket.emit("chat:typing", { roomId: activeRoom.id, userId: user.id, name: user.name });
  }

  function roomName(room: ChatRoom): string {
    if (room.name) return room.name;
    if (room.type === "DIRECT") {
      const other = room.members.find((m) => m.userId !== user?.id);
      return other?.user?.name || "Unknown";
    }
    return `${room.type} Chat`;
  }

  function roomIcon(room: ChatRoom) {
    if (room.type === "DIRECT") {
      const other = room.members.find((m) => m.userId !== user?.id);
      const initial = other?.user?.name?.[0] || "?";
      return <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-sm font-black text-blue-700">{initial}</div>;
    }
    return <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-sm font-black text-indigo-700"><Users size={16} /></div>;
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 overflow-hidden rounded-2xl border bg-white shadow-sm">
      {/* Sidebar */}
      <aside className={`flex w-80 shrink-0 flex-col border-r bg-slate-50 transition-all ${sidebarOpen ? "block" : "hidden lg:block"}`}>
        <div className="flex items-center justify-between border-b px-4 py-4">
          <h2 className="flex items-center gap-2 text-lg font-black"><MessageCircle size={20} className="text-blue-600" />Chat</h2>
          <button onClick={() => { setShowNewChat(!showNewChat); loadUsers(); }} className="rounded-xl bg-blue-700 p-2 text-white hover:bg-blue-800"><Plus size={18} /></button>
        </div>

        {showNewChat && (
          <div className="border-b bg-blue-50 p-4 space-y-2">
            <div className="flex gap-2">
              <input className={field + " flex-1"} placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              <button onClick={createGroup} className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white">Create</button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {chatUsers.filter((u) => u.id !== user?.id).map((u) => (
                <div key={u.id} className="flex items-center gap-2">
                  <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => setSelectedUsers((prev) => prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id])} className="h-4 w-4" />
                  <span className="text-sm font-semibold flex-1">{u.name}</span>
                  <button onClick={() => startDirectChat(u.id)} className="text-xs font-bold text-blue-600 hover:text-blue-800">DM</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {rooms.map((room) => {
            const lastMsg = room.messages?.[0];
            return (
              <button key={room.id} onClick={() => selectRoom(room)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${activeRoom?.id === room.id ? "bg-blue-100 text-blue-900" : "hover:bg-white"}`}>
                {roomIcon(room)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{roomName(room)}</p>
                  {lastMsg && <p className="text-xs text-slate-500 truncate">{lastMsg.sender?.name}: {lastMsg.body}</p>}
                </div>
                {lastMsg && <p className="text-[10px] font-bold text-slate-400 shrink-0">{formatTime(lastMsg.createdAt)}</p>}
              </button>
            );
          })}
          {rooms.length === 0 && <p className="px-3 pt-8 text-center text-sm font-bold text-slate-400">No conversations yet</p>}
        </nav>
      </aside>

      {/* Main chat area */}
      <section className="flex flex-1 flex-col">
        {activeRoom ? (
          <>
            <header className="flex items-center gap-3 border-b px-5 py-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden"><ChevronLeft size={20} /></button>
              {roomIcon(activeRoom)}
              <div>
                <h3 className="text-base font-black">{roomName(activeRoom)}</h3>
                <p className="text-xs font-bold text-slate-400">{activeRoom.members.length} members</p>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.map((msg) => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${isMine ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"}`}>
                      {!isMine && <p className="text-xs font-bold text-slate-500 mb-1">{msg.sender?.name}</p>}
                      <p className="text-sm">{msg.body}</p>
                      <div className={`mt-1 flex items-center gap-2 text-[10px] font-bold ${isMine ? "text-blue-200" : "text-slate-400"}`}>
                        <span>{formatTime(msg.createdAt)}</span>
                        {msg.reads.length > 0 && <span>Read</span>}
                      </div>
                    </div>
                  </div>
                );
              })}

              {Object.keys(typingUsers).length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-400 italic">
                  <MessageSquare size={14} className="animate-pulse" />
                  {Object.values(typingUsers).join(", ")} typing...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <footer className="border-t p-4">
              <div className="flex gap-2">
                <input className={field + " flex-1"} placeholder="Type a message..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} onKeyUp={handleTyping} />
                <button onClick={sendMessage} disabled={!input.trim()} className="flex items-center gap-1.5 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"><Send size={16} />Send</button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageCircle size={48} className="mx-auto text-slate-200" />
              <p className="mt-4 text-lg font-black text-slate-400">Select a conversation</p>
              <p className="text-sm text-slate-400">or start a new one</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
