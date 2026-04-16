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

  console.error("[Unhandled Error]", err);

  const fallbackError: ApiError = {
    code: ErrorCodes.INTERNAL_ERROR,
    message: "Internal Server Error",
  };

  return ApiResponse.error(res, 500, fallbackError);
}

export { errorHandler };
