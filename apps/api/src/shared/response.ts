import type { Response } from "express";

import type { ErrorCode } from "./error-codes";

type ApiError = {
  code: ErrorCode;
  message: string;
  details?: unknown;
};

type ApiMeta = Record<string, unknown>;

type ApiResponseShape<T> = {
  success: boolean;
  message: string;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
};

class ApiResponse {
  static ok<T>(res: Response, data?: T, message = "OK", meta?: ApiMeta) {
    const payload: ApiResponseShape<T> = {
      success: true,
      message,
      data,
      meta,
    };

    return res.status(200).json(ApiResponse.clean(payload));
  }

  static created<T>(
    res: Response,
    data?: T,
    message = "Created",
    meta?: ApiMeta,
  ) {
    const payload: ApiResponseShape<T> = {
      success: true,
      message,
      data,
      meta,
    };

    return res.status(201).json(ApiResponse.clean(payload));
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }

  static error(res: Response, status: number, error: ApiError, meta?: ApiMeta) {
    const payload: ApiResponseShape<null> = {
      success: false,
      message: error.message,
      error,
      meta,
    };

    return res.status(status).json(ApiResponse.clean(payload));
  }

  static badRequest(res: Response, error: ApiError, meta?: ApiMeta) {
    return ApiResponse.error(res, 400, error, meta);
  }

  static unauthorized(res: Response, error: ApiError, meta?: ApiMeta) {
    return ApiResponse.error(res, 401, error, meta);
  }

  static forbidden(res: Response, error: ApiError, meta?: ApiMeta) {
    return ApiResponse.error(res, 403, error, meta);
  }

  static notFound(res: Response, error: ApiError, meta?: ApiMeta) {
    return ApiResponse.error(res, 404, error, meta);
  }

  static internal(res: Response, error: ApiError, meta?: ApiMeta) {
    return ApiResponse.error(res, 500, error, meta);
  }

  private static clean<T>(payload: ApiResponseShape<T>) {
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    ) as ApiResponseShape<T>;
  }
}

export type { ApiError, ApiMeta, ApiResponseShape };
export { ApiResponse };
