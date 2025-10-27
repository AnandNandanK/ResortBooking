import type { Request, Response, NextFunction } from "express";

// Type for async Express route functions
export type AsyncFunction<T = any> = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<T>;

// asyncHandler utility
export const asyncHandler = <T = any>(fn: AsyncFunction<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
