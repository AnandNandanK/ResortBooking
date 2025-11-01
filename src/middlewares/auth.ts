import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

// ✅ Custom request type
export interface AuthenticatedRequest extends Request {
  userId?: number;
}

export const isAuthenticated = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // ✅ Get token from Authorization header OR cookie
    const token =
      req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // ✅ Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload & { userId?: number };

    // console.log("Decoded JWT:", decoded);

    // ✅ Attach userId to request
    if (decoded.userId) {
      req.userId = decoded.userId;
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    next();
  } catch (error: any) {
    console.error("Auth Middleware Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};


export const isAdminOrSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    next();
  } else {
    return res.status(403).json({ message: "Access denied" });
  }
};