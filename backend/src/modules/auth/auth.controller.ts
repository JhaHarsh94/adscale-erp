import { Response } from "express";
import prisma from "../../config/prisma";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { comparePassword, hashPassword } from "../../utils/password";
import { generateToken } from "../../utils/jwt";
import { successResponse } from "../../utils/response";
import { AuthRequest } from "../../middlewares/auth.middleware";

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
      role: true,
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
      role: user.role.name,
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
      role: true,
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
      role: user.role.name,
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
      role: true,
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
    role: user.role.name,
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