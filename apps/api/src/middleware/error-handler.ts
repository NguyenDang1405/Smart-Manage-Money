import type { NextFunction, Request, Response } from "express";

import { AppError } from "../shared/app-error";
import { ErrorCodes } from "../shared/error-codes";
import { ApiResponse, type ApiError } from "../shared/response";
import { ZodError } from "zod";

function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return ApiResponse.error(res, err.status, err.toApiError());
  }

  if (err instanceof ZodError) {
    const validationError: ApiError = {
      code: ErrorCodes.VALIDATION_FAILED,
      message: "Validation Failed",
      details: err.issues,
    };
    return ApiResponse.error(res, 400, validationError);
  }

  // Handle Clerk errors
  if (err && typeof err === 'object' && 'clerkError' in err) {
    console.error("[Clerk Error]", JSON.stringify(err, null, 2));
    const clerkErr = err as any;
    const fallbackError: ApiError = {
      code: ErrorCodes.UNAUTHORIZED,
      message: clerkErr.message || "Clerk authentication error",
    };
    return ApiResponse.error(res, clerkErr.status || 401, fallbackError);
  }

  // Log full error for debugging
  const errObj = err as any;
  console.error("[Unhandled Error]", {
    message: errObj?.message,
    stack: errObj?.stack?.split('\n').slice(0, 5).join('\n'),
    name: errObj?.name,
    code: errObj?.code,
    status: errObj?.status,
  });

  const fallbackError: ApiError = {
    code: ErrorCodes.INTERNAL_ERROR,
    message: errObj?.message || "Internal Server Error",
  };

  return ApiResponse.error(res, errObj?.status || 500, fallbackError);
}

export { errorHandler };

