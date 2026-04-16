import { ErrorCodes, type ErrorCode } from "./error-codes";
import type { ApiError } from "./response";

type AppErrorOptions = {
  message: string;
  status?: number;
  code?: ErrorCode;
  details?: unknown;
};

class AppError extends Error {
  status: number;
  code: ErrorCode;
  details?: unknown;

  constructor({
    message,
    status = 500,
    code = ErrorCodes.INTERNAL_ERROR,
    details,
  }: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export type { AppErrorOptions };
export { AppError };
