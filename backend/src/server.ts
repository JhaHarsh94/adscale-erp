import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./config/prisma";
import { errorMiddleware } from "./middlewares/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import departmentRoutes from "./modules/departments/department.routes";
import designationRoutes from "./modules/designations/designation.routes";
import teamRoutes from "./modules/teams/team.routes";
import reportingHierarchyRoutes from "./modules/reportingHierarchy/reportingHierarchy.routes";
import organizationRoutes from "./modules/organization/organization.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

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
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});