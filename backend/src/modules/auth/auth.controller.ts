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
