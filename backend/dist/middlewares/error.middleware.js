"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const AppError_1 = require("../utils/AppError");
const errorMiddleware = (error, req, res, next) => {
    let statusCode = 500;
    let message = "Internal Server Error";
    console.error(`[ERROR] ${error.message}`, error.stack);
    if (error instanceof AppError_1.AppError) {
        statusCode = error.statusCode;
        message = error.message;
    }
    return res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === "development"
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            }
            : null,
    });
};
exports.errorMiddleware = errorMiddleware;
