import { Server as SocketServer } from "socket.io";

let io: SocketServer | null = null;

export function setIO(instance: SocketServer) { io = instance; }
export function getIO(): SocketServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}
