"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setup = exports.setupStatus = exports.adminRegister = exports.getUsers = exports.resetPassword = exports.verifyOtp = exports.forgotPassword = exports.logout = exports.getMe = exports.login = exports.register = void 0;
const prisma_1 = __importDefault(require("../../config/prisma"));
const asyncHandler_1 = require("../../utils/asyncHandler");
const AppError_1 = require("../../utils/AppError");
const password_1 = require("../../utils/password");
const jwt_1 = require("../../utils/jwt");
const response_1 = require("../../utils/response");
const otp_1 = require("../../utils/otp");
const email_1 = require("../../utils/email");
const roleWithPermissions = {
    include: {
        rolePermissions: {
            include: { permission: true },
        },
    },
};
const serializeRole = (role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.rolePermissions.map((item) => item.permission.name),
});
exports.register = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, email, phone, password, roleName } = req.body;
    if (!name || !email || !password) {
        throw new AppError_1.AppError("Name, email and password are required", 400);
    }
    if (password.length < 6) {
        throw new AppError_1.AppError("Password must be at least 6 characters", 400);
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma_1.default.user.findUnique({
        where: {
            email: normalizedEmail,
        },
    });
    if (existingUser) {
        throw new AppError_1.AppError("User already exists with this email", 409);
    }
    const role = await prisma_1.default.role.findUnique({
        where: {
            name: roleName || "EMPLOYEE",
        },
    });
    if (!role) {
        throw new AppError_1.AppError("Selected role does not exist. Please seed roles first.", 400);
    }
    const hashedPassword = await (0, password_1.hashPassword)(password);
    const user = await prisma_1.default.user.create({
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
    const token = (0, jwt_1.generateToken)({
        userId: user.id,
        email: user.email,
        role: user.role.name,
    });
    return (0, response_1.successResponse)(res, 201, "User registered successfully", {
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
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new AppError_1.AppError("Email and password are required", 400);
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma_1.default.user.findUnique({
        where: {
            email: normalizedEmail,
        },
        include: {
            role: roleWithPermissions,
        },
    });
    if (!user) {
        throw new AppError_1.AppError("Invalid email or password", 401);
    }
    if (user.status !== "ACTIVE") {
        throw new AppError_1.AppError("Your account is not active", 403);
    }
    const isPasswordMatch = await (0, password_1.comparePassword)(password, user.password);
    if (!isPasswordMatch) {
        throw new AppError_1.AppError("Invalid email or password", 401);
    }
    const token = (0, jwt_1.generateToken)({
        userId: user.id,
        email: user.email,
        role: user.role.name,
    });
    await prisma_1.default.loginHistory.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            device: req.headers["user-agent"],
        },
    });
    await prisma_1.default.deviceSession.create({
        data: {
            userId: user.id,
            ipAddress: req.ip,
            deviceName: req.headers["user-agent"],
            token,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Login successful", {
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
exports.getMe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new AppError_1.AppError("User not authenticated", 401);
    }
    const user = await prisma_1.default.user.findUnique({
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
        throw new AppError_1.AppError("User not found", 404);
    }
    return (0, response_1.successResponse)(res, 200, "Profile fetched successfully", {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: serializeRole(user.role),
        status: user.status,
        employee: user.employee,
    });
});
exports.logout = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];
    if (token) {
        await prisma_1.default.deviceSession.updateMany({
            where: {
                token,
            },
            data: {
                isActive: false,
            },
        });
    }
    return (0, response_1.successResponse)(res, 200, "Logout successful");
});
exports.forgotPassword = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new AppError_1.AppError("Email is required", 400);
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma_1.default.user.findUnique({
        where: {
            email: normalizedEmail,
        },
    });
    if (!user) {
        throw new AppError_1.AppError("No user found with this email", 404);
    }
    await prisma_1.default.otpVerification.updateMany({
        where: {
            email: normalizedEmail,
            purpose: "FORGOT_PASSWORD",
            isUsed: false,
        },
        data: {
            isUsed: true,
        },
    });
    const otp = (0, otp_1.generateOtp)();
    await prisma_1.default.otpVerification.create({
        data: {
            userId: user.id,
            email: normalizedEmail,
            otp,
            purpose: "FORGOT_PASSWORD",
            expiresAt: (0, otp_1.getOtpExpiry)(),
        },
    });
    await (0, email_1.sendOtpEmail)({
        to: normalizedEmail,
        otp,
        purpose: "Forgot Password",
    });
    return (0, response_1.successResponse)(res, 200, "Password reset OTP sent successfully");
});
exports.verifyOtp = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, otp, purpose } = req.body;
    if (!email || !otp) {
        throw new AppError_1.AppError("Email and OTP are required", 400);
    }
    const normalizedEmail = email.toLowerCase().trim();
    const otpRecord = await prisma_1.default.otpVerification.findFirst({
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
        throw new AppError_1.AppError("Invalid or expired OTP", 400);
    }
    return (0, response_1.successResponse)(res, 200, "OTP verified successfully");
});
exports.resetPassword = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        throw new AppError_1.AppError("Email, OTP and new password are required", 400);
    }
    if (newPassword.length < 6) {
        throw new AppError_1.AppError("Password must be at least 6 characters", 400);
    }
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma_1.default.user.findUnique({
        where: {
            email: normalizedEmail,
        },
    });
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    const otpRecord = await prisma_1.default.otpVerification.findFirst({
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
        throw new AppError_1.AppError("Invalid or expired OTP", 400);
    }
    const hashedPassword = await (0, password_1.hashPassword)(newPassword);
    await prisma_1.default.user.update({
        where: {
            id: user.id,
        },
        data: {
            password: hashedPassword,
        },
    });
    await prisma_1.default.otpVerification.update({
        where: {
            id: otpRecord.id,
        },
        data: {
            isUsed: true,
        },
    });
    await prisma_1.default.deviceSession.updateMany({
        where: {
            userId: user.id,
            isActive: true,
        },
        data: {
            isActive: false,
        },
    });
    return (0, response_1.successResponse)(res, 200, "Password reset successfully");
});
exports.getUsers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const users = await prisma_1.default.user.findMany({
        include: {
            role: { select: { id: true, name: true } },
            employee: { select: { id: true, employeeCode: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    return (0, response_1.successResponse)(res, 200, "Users fetched", users);
});
exports.adminRegister = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { name, email, phone, password, roleName } = req.body;
    if (!name || !email || !password || !roleName) {
        throw new AppError_1.AppError("Name, email, password, and roleName are required", 400);
    }
    if (password.length < 6) {
        throw new AppError_1.AppError("Password must be at least 6 characters", 400);
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma_1.default.user.findUnique({
        where: { email: normalizedEmail },
    });
    if (existingUser) {
        throw new AppError_1.AppError("User already exists with this email", 409);
    }
    const role = await prisma_1.default.role.findUnique({
        where: { name: roleName },
    });
    if (!role) {
        throw new AppError_1.AppError("Selected role does not exist", 400);
    }
    const hashedPassword = await (0, password_1.hashPassword)(password);
    const user = await prisma_1.default.user.create({
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
    return (0, response_1.successResponse)(res, 201, "User created successfully", {
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
    const list = [];
    for (const module of modules) {
        for (const action of actions) {
            list.push({ name: `${module}_${action}`, module, action, description: `${action.toLowerCase()} ${module.toLowerCase()}` });
        }
    }
    list.push({ name: "ATTENDANCE_APPROVE", module: "ATTENDANCE", action: "APPROVE", description: "approve attendance requests" });
    list.push({ name: "LEAVES_APPROVE", module: "LEAVES", action: "APPROVE", description: "approve leave requests" });
    return list;
})();
const rolePermissionRules = {
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
exports.setupStatus = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const userCount = await prisma_1.default.user.count();
    return (0, response_1.successResponse)(res, 200, "Setup status", { needsSetup: userCount === 0 });
});
exports.setup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userCount = await prisma_1.default.user.count();
    if (userCount > 0)
        throw new AppError_1.AppError("System already has users. Reset database to re-run setup.", 400);
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        throw new AppError_1.AppError("Name, email, and password are required for admin account", 400);
    if (password.length < 6)
        throw new AppError_1.AppError("Password must be at least 6 characters", 400);
    for (const role of setupRoles) {
        await prisma_1.default.role.upsert({ where: { name: role.name }, update: { description: role.description }, create: role });
    }
    for (const perm of setupPermissions) {
        await prisma_1.default.permission.upsert({ where: { name: perm.name }, update: { module: perm.module, action: perm.action }, create: perm });
    }
    const savedRoles = await prisma_1.default.role.findMany();
    const savedPermissions = await prisma_1.default.permission.findMany();
    for (const role of savedRoles) {
        const rule = rolePermissionRules[role.name] || (() => false);
        const ids = savedPermissions.filter(rule).map((p) => p.id);
        await prisma_1.default.rolePermission.deleteMany({ where: { roleId: role.id } });
        if (ids.length) {
            await prisma_1.default.rolePermission.createMany({ data: ids.map((permissionId) => ({ roleId: role.id, permissionId })) });
        }
    }
    const adminRole = savedRoles.find((r) => r.name === "SUPER_ADMIN");
    const hashed = await (0, password_1.hashPassword)(password);
    const user = await prisma_1.default.user.create({
        data: { name, email: email.toLowerCase().trim(), password: hashed, roleId: adminRole.id },
    });
    const token = (0, jwt_1.generateToken)({ userId: user.id, email: user.email, role: adminRole.name });
    return (0, response_1.successResponse)(res, 201, "System setup complete", {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: { id: adminRole.id, name: adminRole.name } },
    });
});
