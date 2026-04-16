import type { Request, Response, NextFunction } from "express";
import { JWTUtils, type TokenPayload } from "../shared/jwt";
import { AppError } from "../shared/app-error";

// Extend Express Request to include authenticated user info
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware to authenticate requests via JWT Bearer token.
 * - Missing token → 401 UNAUTHORIZED
 * - Expired token → 401 TOKEN_EXPIRED (signals client to auto-logout)
 * - Invalid token → 401 UNAUTHORIZED
 * - Valid token → attaches decoded payload to `req.user` and proceeds
 */
function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(
      new AppError({
        message: "Authentication required",
        status: 401,
        code: "UNAUTHORIZED",
      })
    );
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next(
      new AppError({
        message: "Authentication required",
        status: 401,
        code: "UNAUTHORIZED",
      })
    );
  }

  const result = JWTUtils.verifyToken(token);

  if (!result.valid && result.expired) {
    return next(
      new AppError({
        message: "Token has expired. Please login again.",
        status: 401,
        code: "TOKEN_EXPIRED",
      })
    );
  }

  if (!result.valid) {
    return next(
      new AppError({
        message: "Invalid authentication token",
        status: 401,
        code: "UNAUTHORIZED",
      })
    );
  }

  // Attach user payload to request for downstream handlers
  req.user = result.payload;
  next();
}

export { authenticate };
