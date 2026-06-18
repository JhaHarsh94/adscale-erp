import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

export const errorMiddleware = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal Server Error";

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }

  return res.status(statusCode).json({
    success: false,
    message,
    error:
      process.env.NODE_ENV === "development"
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : null,
  });
};