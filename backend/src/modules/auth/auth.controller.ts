import { Response } from "express";
import prisma from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { comparePassword, hashPassword } from "../../utils/password";
import { generateToken } from "../../utils/jwt";
import { successResponse } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { generateOtp, getOtpExpiry } from "../../utils/otp";
import { sendOtpEmail } from "../../utils/email";

const roleWithPermissions = {
  include: {
    rolePermissions: {
      include: { permission: true },
    },
  },
};

const serializeRole = (role: {
  id: string;
  name: string;
  description: string | null;
  rolePermissions: Array<{ permission: { name: string } }>;
}) => ({
  id: role.id,
  name: role.name,
  description: role.description,
  permissions: role.rolePermissions.map((item) => item.permission.name),
});

export const register = asyncHandler(async (req, res: Response) => {
  const { name, email, phone, password, roleName } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required", 400);
  }

  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw new AppError("User already exists with this email", 409);
  }

  const role = await prisma.role.findUnique({
    where: {
      name: roleName || "EMPLOYEE",
    },
  });

  if (!role) {
    throw new AppError("Selected role does not exist. Please seed roles first.", 400);
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      roleId: role.id,
    },
    include: {
      role: roleWithPermissions,
    },
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role.name,
  });

  return successResponse(res, 201, "User registered successfully", {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: serializeRole(user.role),
      status: user.status,
    },
  });
});

export const login = asyncHandler(async (req, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    include: {
      role: roleWithPermissions,
    },
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (user.status !== "ACTIVE") {
    throw new AppError("Your account is not active", 403);
  }

  const isPasswordMatch = await comparePassword(password, user.password);

  if (!isPasswordMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role.name,
  });

  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      ipAddress: req.ip,
      device: req.headers["user-agent"],
    },
  });

  await prisma.deviceSession.create({
    data: {
      userId: user.id,
      ipAddress: req.ip,
      deviceName: req.headers["user-agent"],
      token,
    },
  });

  return successResponse(res, 200, "Login successful", {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: serializeRole(user.role),
      status: user.status,
    },
  });
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError("User not authenticated", 401);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: req.user.id,
    },
    include: {
      role: roleWithPermissions,
      employee: {
        include: {
          department: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return successResponse(res, 200, "Profile fetched successfully", {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: serializeRole(user.role),
    status: user.status,
    employee: user.employee,
  });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (token) {
    await prisma.deviceSession.updateMany({
      where: {
        token,
      },
      data: {
        isActive: false,
      },
    });
  }

  return successResponse(res, 200, "Logout successful");
});

export const forgotPassword = asyncHandler(async (req, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError("Email is required", 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    throw new AppError("No user found with this email", 404);
  }

  await prisma.otpVerification.updateMany({
    where: {
      email: normalizedEmail,
      purpose: "FORGOT_PASSWORD",
      isUsed: false,
    },
    data: {
      isUsed: true,
    },
  });

  const otp = generateOtp();

  await prisma.otpVerification.create({
    data: {
      userId: user.id,
      email: normalizedEmail,
      otp,
      purpose: "FORGOT_PASSWORD",
      expiresAt: getOtpExpiry(),
    },
  });

  await sendOtpEmail({
    to: normalizedEmail,
    otp,
    purpose: "Forgot Password",
  });

  return successResponse(res, 200, "Password reset OTP sent successfully");
});

export const verifyOtp = asyncHandler(async (req, res: Response) => {
  const { email, otp, purpose } = req.body;

  if (!email || !otp) {
    throw new AppError("Email and OTP are required", 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const otpRecord = await prisma.otpVerification.findFirst({
    where: {
      email: normalizedEmail,
      otp,
      purpose: purpose || "FORGOT_PASSWORD",
      isUsed: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otpRecord) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  return successResponse(res, 200, "OTP verified successfully");
});

export const resetPassword = asyncHandler(async (req, res: Response) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    throw new AppError("Email, OTP and new password are required", 400);
  }

  if (newPassword.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const otpRecord = await prisma.otpVerification.findFirst({
    where: {
      email: normalizedEmail,
      otp,
      purpose: "FORGOT_PASSWORD",
      isUsed: false,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otpRecord) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  await prisma.otpVerification.update({
    where: {
      id: otpRecord.id,
    },
    data: {
      isUsed: true,
    },
  });

  await prisma.deviceSession.updateMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  return successResponse(res, 200, "Password reset successfully");
});

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    include: {
      role: { select: { id: true, name: true } },
      employee: { select: { id: true, employeeCode: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return successResponse(res, 200, "Users fetched", users);
});

export const adminRegister = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, phone, password, roleName } = req.body;

  if (!name || !email || !password || !roleName) {
    throw new AppError("Name, email, password, and roleName are required", 400);
  }

  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new AppError("User already exists with this email", 409);
  }

  const role = await prisma.role.findUnique({
    where: { name: roleName },
  });

  if (!role) {
    throw new AppError("Selected role does not exist", 400);
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      phone: phone || null,
      password: hashedPassword,
      roleId: role.id,
    },
    include: {
      role: { select: { id: true, name: true } },
    },
  });

  return successResponse(res, 201, "User created successfully", {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
  });
});

const setupRoles = [
  { name: "SUPER_ADMIN", description: "Full system access" },
  { name: "DIRECTOR", description: "Company dashboard, reports, finance" },
  { name: "OPERATIONS_MANAGER", description: "Projects, teams, tickets, approvals" },
  { name: "HR", description: "Employees, attendance, leave, recruitment" },
  { name: "SALES_MANAGER", description: "Leads, CRM, proposals" },
  { name: "TEAM_LEAD", description: "Tasks, tickets, approvals, team worklogs" },
  { name: "EMPLOYEE", description: "Assigned tasks, attendance, leave" },
  { name: "FREELANCER", description: "Limited access to assigned work" },
  { name: "CLIENT", description: "Client portal access only" },
];

const setupPermissions = (() => {
  const modules = ["USERS", "ROLES", "PERMISSIONS", "DEPARTMENTS", "TEAMS", "DESIGNATIONS", "EMPLOYEES", "ATTENDANCE", "LEAVES", "CRM", "COMMERCIAL", "PROJECTS", "TICKETS"];
  const actions = ["VIEW", "CREATE", "UPDATE", "DELETE"];
  const list: { name: string; module: string; action: string; description: string }[] = [];
  for (const module of modules) {
    for (const action of actions) {
      list.push({ name: `${module}_${action}`, module, action, description: `${action.toLowerCase()} ${module.toLowerCase()}` });
    }
  }
  list.push({ name: "ATTENDANCE_APPROVE", module: "ATTENDANCE", action: "APPROVE", description: "approve attendance requests" });
  list.push({ name: "LEAVES_APPROVE", module: "LEAVES", action: "APPROVE", description: "approve leave requests" });
  return list;
})();

const rolePermissionRules: Record<string, (p: { name: string; module: string; action: string }) => boolean> = {
  SUPER_ADMIN: () => true,
  DIRECTOR: () => true,
  OPERATIONS_MANAGER: (p) => ["DEPARTMENTS", "TEAMS", "DESIGNATIONS", "EMPLOYEES", "ATTENDANCE", "LEAVES", "CRM", "COMMERCIAL", "PROJECTS", "TICKETS"].includes(p.module),
  HR: (p) => ["DEPARTMENTS", "TEAMS", "DESIGNATIONS", "EMPLOYEES", "ATTENDANCE", "LEAVES"].includes(p.module),
  SALES_MANAGER: (p) => ["CRM", "COMMERCIAL"].includes(p.module) || (p.module === "EMPLOYEES" && p.action === "VIEW"),
  TEAM_LEAD: (p) => ["EMPLOYEES", "ATTENDANCE", "LEAVES", "CRM", "TICKETS"].includes(p.module) && p.action !== "DELETE",
  EMPLOYEE: (p) => ["ATTENDANCE", "LEAVES", "TICKETS"].includes(p.module) && ["VIEW", "CREATE"].includes(p.action),
  FREELANCER: (p) => ["ATTENDANCE", "LEAVES"].includes(p.module) && p.action === "VIEW",
  CLIENT: () => false,
};

export const setupStatus = asyncHandler(async (_req, res: Response) => {
  const userCount = await prisma.user.count();
  return successResponse(res, 200, "Setup status", { needsSetup: userCount === 0 });
});

export const setup = asyncHandler(async (req, res: Response) => {
  const userCount = await prisma.user.count();
  if (userCount > 0) throw new AppError("System already has users. Reset database to re-run setup.", 400);

  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new AppError("Name, email, and password are required for admin account", 400);
  if (password.length < 6) throw new AppError("Password must be at least 6 characters", 400);

  for (const role of setupRoles) {
    await prisma.role.upsert({ where: { name: role.name }, update: { description: role.description }, create: role });
  }
  for (const perm of setupPermissions) {
    await prisma.permission.upsert({ where: { name: perm.name }, update: { module: perm.module, action: perm.action }, create: perm });
  }

  const savedRoles = await prisma.role.findMany();
  const savedPermissions = await prisma.permission.findMany();

  for (const role of savedRoles) {
    const rule = rolePermissionRules[role.name] || (() => false);
    const ids = savedPermissions.filter(rule).map((p) => p.id);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (ids.length) {
      await prisma.rolePermission.createMany({ data: ids.map((permissionId) => ({ roleId: role.id, permissionId })) });
    }
  }

  const adminRole = savedRoles.find((r) => r.name === "SUPER_ADMIN")!;
  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase().trim(), password: hashed, roleId: adminRole.id },
  });

  const token = generateToken({ userId: user.id, email: user.email, role: adminRole.name });

  return successResponse(res, 201, "System setup complete", {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: { id: adminRole.id, name: adminRole.name } },
  });
});
