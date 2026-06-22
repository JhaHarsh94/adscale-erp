import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(userId: string) {
  if (socket?.connected) return socket;
  socket = io(import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5000", {
    query: { userId },
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

export function getSocket() { return socket; }
