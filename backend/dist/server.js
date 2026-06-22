"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("./config/prisma"));
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
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
app.use("/api/auth", auth_routes_1.default);
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
app.use(error_middleware_1.errorMiddleware);
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
