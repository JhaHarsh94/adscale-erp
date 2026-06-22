"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowPermissions = exports.allowRoles = exports.protect = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const jwt_1 = require("../utils/jwt");
const AppError_1 = require("../utils/AppError");
const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AppError_1.AppError("Authentication token missing", 401);
        }
        const token = authHeader.split(" ")[1];
        const decoded = (0, jwt_1.verifyToken)(token);
        const user = await prisma_1.default.user.findUnique({
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
            throw new AppError_1.AppError("User not found", 401);
        }
        if (user.status !== "ACTIVE") {
            throw new AppError_1.AppError("User account is not active", 403);
        }
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role.name,
            permissions: user.role.rolePermissions.map((item) => item.permission.name),
        };
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.protect = protect;
const allowRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AppError_1.AppError("User not authenticated", 401));
        }
        if (!roles.includes(req.user.role)) {
            return next(new AppError_1.AppError("You do not have permission for this action", 403));
        }
        next();
    };
};
exports.allowRoles = allowRoles;
const allowPermissions = (...permissions) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new AppError_1.AppError("User not authenticated", 401));
        }
        if (req.user.role === "SUPER_ADMIN") {
            return next();
        }
        const hasPermission = permissions.some((permission) => req.user?.permissions.includes(permission));
        if (!hasPermission) {
            return next(new AppError_1.AppError("You do not have permission for this action", 403));
        }
        next();
    };
};
exports.allowPermissions = allowPermissions;
