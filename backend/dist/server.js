"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_io_1 = require("socket.io");
const prisma_1 = __importDefault(require("./config/prisma"));
const socket_1 = require("./config/socket");
const error_middleware_1 = require("./middlewares/error.middleware");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/dashboard/dashboard.routes"));
const department_routes_1 = __importDefault(require("./modules/departments/department.routes"));
const designation_routes_1 = __importDefault(require("./modules/designations/designation.routes"));
const team_routes_1 = __importDefault(require("./modules/teams/team.routes"));
const reportingHierarchy_routes_1 = __importDefault(require("./modules/reportingHierarchy/reportingHierarchy.routes"));
const organization_routes_1 = __importDefault(require("./modules/organization/organization.routes"));
const employee_routes_1 = __importDefault(require("./modules/employees/employee.routes"));
const attendance_routes_1 = __importDefault(require("./modules/attendance/attendance.routes"));
const leave_routes_1 = __importDefault(require("./modules/leaves/leave.routes"));
const crm_routes_1 = __importDefault(require("./modules/crm/crm.routes"));
const access_routes_1 = require("./modules/access/access.routes");
const commercial_routes_1 = __importDefault(require("./modules/commercial/commercial.routes"));
const project_routes_1 = __importDefault(require("./modules/projects/project.routes"));
const ticket_routes_1 = __importDefault(require("./modules/tickets/ticket.routes"));
const task_routes_1 = __importDefault(require("./modules/tasks/task.routes"));
const notification_routes_1 = __importDefault(require("./modules/notifications/notification.routes"));
const worklog_routes_1 = __importDefault(require("./modules/worklogs/worklog.routes"));
const approval_routes_1 = __importDefault(require("./modules/approvals/approval.routes"));
const file_routes_1 = __importDefault(require("./modules/files/file.routes"));
const chat_routes_1 = __importDefault(require("./modules/chat/chat.routes"));
const meeting_routes_1 = __importDefault(require("./modules/meetings/meeting.routes"));
const meetingManagement_routes_1 = __importDefault(require("./modules/meetingManagement/meetingManagement.routes"));
const knowledgeBase_routes_1 = __importDefault(require("./modules/knowledgeBase/knowledgeBase.routes"));
const hrms_routes_1 = __importDefault(require("./modules/hrms/hrms.routes"));
const payroll_routes_1 = __importDefault(require("./modules/payroll/payroll.routes"));
const recruitment_routes_1 = __importDefault(require("./modules/recruitment/recruitment.routes"));
const clientPortal_routes_1 = __importDefault(require("./modules/clientPortal/clientPortal.routes"));
const seo_routes_1 = __importDefault(require("./modules/seo/seo.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, { cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] } });
exports.io = io;
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:3000", "http://localhost"];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(express_1.default.json({ limit: "2mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "2mb" }));
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later" },
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many auth attempts, please try again later" },
});
app.use(globalLimiter);
/* Socket.IO - real-time notifications & chat */
io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId)
        socket.join(`user:${userId}`);
    /* Chat: join a room */
    socket.on("chat:join", (roomId) => {
        socket.join(`room:${roomId}`);
    });
    /* Chat: leave a room */
    socket.on("chat:leave", (roomId) => {
        socket.leave(`room:${roomId}`);
    });
    /* Chat: typing indicator */
    socket.on("chat:typing", (data) => {
        socket.to(`room:${data.roomId}`).emit("chat:typing", data);
    });
    socket.on("disconnect", () => { });
});
(0, socket_1.setIO)(io);
const PORT = process.env.PORT || 5000;
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "AdScale One ERP Backend is running",
    });
});
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        status: "healthy",
        service: "AdScale One ERP API",
    });
});
app.get("/api/health/db", async (req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        res.status(200).json({
            success: true,
            status: "connected",
            database: "PostgreSQL",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            status: "database connection failed",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
app.use("/api/auth", authLimiter, auth_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.use("/api/departments", department_routes_1.default);
app.use("/api/designations", designation_routes_1.default);
app.use("/api/teams", team_routes_1.default);
app.use("/api/reporting-hierarchy", reportingHierarchy_routes_1.default);
app.use("/api/organization", organization_routes_1.default);
app.use("/api/employees", employee_routes_1.default);
app.use("/api/attendance", attendance_routes_1.default);
app.use("/api/leaves", leave_routes_1.default);
app.use("/api/crm", crm_routes_1.default);
app.use("/api/roles", access_routes_1.roleRoutes);
app.use("/api/permissions", access_routes_1.permissionRoutes);
app.use("/api/commercial", commercial_routes_1.default);
app.use("/api/projects", project_routes_1.default);
app.use("/api/tickets", ticket_routes_1.default);
app.use("/api/tasks", task_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
app.use("/api/worklogs", worklog_routes_1.default);
app.use("/api/approvals", approval_routes_1.default);
app.use("/api/files", file_routes_1.default);
app.use("/api/chat", chat_routes_1.default);
app.use("/api/meetings", meeting_routes_1.default);
app.use("/api/meeting-management", meetingManagement_routes_1.default);
app.use("/api/knowledge-base", knowledgeBase_routes_1.default);
app.use("/api/hrms", hrms_routes_1.default);
app.use("/api/payroll", payroll_routes_1.default);
app.use("/api/recruitment", recruitment_routes_1.default);
app.use("/api/client-portal", clientPortal_routes_1.default);
app.use("/api/seo", seo_routes_1.default);
app.use(error_middleware_1.errorMiddleware);
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
