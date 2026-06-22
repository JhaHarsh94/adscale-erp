import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import prisma from "./config/prisma";
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

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] } });

app.use(cors());
app.use(express.json());

/* Socket.IO - real-time notifications */
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId as string;
  if (userId) socket.join(`user:${userId}`);
  socket.on("disconnect", () => {});
});

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

app.use("/api/auth", authRoutes);
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
app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
