import { Request, Response, NextFunction } from "express";

type AppRequest = Request<Record<string, string>, unknown, any, any>;

export const asyncHandler =
  (fn: (req: AppRequest, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as AppRequest, res, next)).catch(next);
  };
