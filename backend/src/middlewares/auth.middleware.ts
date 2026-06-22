import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { verifyToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Authentication token missing", 401);
    }

    const token = authHeader.split(" ")[1];

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", 401);
    }

    if (user.status !== "ACTIVE") {
      throw new AppError("User account is not active", 403);
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: user.role.rolePermissions.map(
        (item) => item.permission.name
      ),
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const allowRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission for this action", 403));
    }

    next();
  };
};

export const allowPermissions = (...permissions: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }

    if (req.user.role === "SUPER_ADMIN") {
      return next();
    }

    const hasPermission = permissions.some((permission) =>
      req.user?.permissions.includes(permission)
    );

    if (!hasPermission) {
      return next(new AppError("You do not have permission for this action", 403));
    }

    next();
  };
};
