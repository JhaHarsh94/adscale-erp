import express, { Request, Response } from "express";
import path from "path";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { Server } from "socket.io";
import prisma from "./config/prisma";
import { setIO } from "./config/socket";
import { errorMiddleware } from "./middlewares/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import departmentRoutes from "./modules/departments/department.routes";
import designationRoutes from "./modules/designations/designation.routes";
import teamRoutes from "./modules/teams/team.routes";
import reportingHierarchyRoutes from "./modules/reportingHierarchy/reportingHierarchy.routes";
import organizationRoutes from "./modules/organization/organization.routes";
import employeeRoutes from "./modules/employees/employee.routes";
import attendanceRoutes from "./modules/attendance/attendance.routes";
import leaveRoutes from "./modules/leaves/leave.routes";
import crmRoutes from "./modules/crm/crm.routes";
import { permissionRoutes, roleRoutes } from "./modules/access/access.routes";
import commercialRoutes from "./modules/commercial/commercial.routes";
import projectRoutes from "./modules/projects/project.routes";
import ticketRoutes from "./modules/tickets/ticket.routes";
import taskRoutes from "./modules/tasks/task.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import workLogRoutes from "./modules/worklogs/worklog.routes";
import approvalRoutes from "./modules/approvals/approval.routes";
import fileRoutes from "./modules/files/file.routes";
import chatRoutes from "./modules/chat/chat.routes";
import meetingRoutes from "./modules/meetings/meeting.routes";
import meetingManagementRoutes from "./modules/meetingManagement/meetingManagement.routes";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] } });

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000", "http://localhost"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many auth attempts, please try again later" },
});

app.use(globalLimiter);

/* Socket.IO - real-time notifications & chat */
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;
  if (userId) socket.join(`user:${userId}`);

  /* Chat: join a room */
  socket.on("chat:join", (roomId: string) => {
    socket.join(`room:${roomId}`);
  });

  /* Chat: leave a room */
  socket.on("chat:leave", (roomId: string) => {
    socket.leave(`room:${roomId}`);
  });

  /* Chat: typing indicator */
  socket.on("chat:typing", (data: { roomId: string; userId: string; name: string }) => {
    socket.to(`room:${data.roomId}`).emit("chat:typing", data);
  });

  socket.on("disconnect", () => {});
});

setIO(io);
export { io };

const PORT = process.env.PORT || 5000;

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "AdScale One ERP Backend is running",
  });
});

app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    service: "AdScale One ERP API",
  });
});

app.get("/api/health/db", async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      status: "connected",
      database: "PostgreSQL",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "database connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/designations", designationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/reporting-hierarchy", reportingHierarchyRoutes);
app.use("/api/organization", organizationRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/commercial", commercialRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/worklogs", workLogRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/meeting-management", meetingManagementRoutes);
app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
