import type { NextFunction, Request, Response } from "express";
import * as z from "zod";

import { AppError } from "../shared/app-error";
import { ErrorCodes } from "../shared/error-codes";

type RequestSchemas = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

type ValidationErrors = Partial<
  Record<keyof RequestSchemas, ReturnType<typeof z.flattenError>>
>;

function validateRequest(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: ValidationErrors = {};

    const validatePart = (
      key: keyof RequestSchemas,
      schema: z.ZodType | undefined,
      value: unknown,
    ) => {
      if (!schema) {
        return { ok: true as const, data: value };
      }

      const result = schema.safeParse(value);
      if (!result.success) {
        errors[key] = z.flattenError(result.error);
        return { ok: false as const };
      }

      return { ok: true as const, data: result.data };
    };

    const bodyResult = validatePart("body", schemas.body, req.body);
    if (bodyResult.ok) {
      req.body = bodyResult.data;
    }

    const queryResult = validatePart("query", schemas.query, req.query);
    if (queryResult.ok) {
      Object.keys(req.query).forEach((key) => {
        delete req.query[key as keyof typeof req.query];
      });
      Object.assign(req.query, queryResult.data as typeof req.query);
    }

    const paramsResult = validatePart("params", schemas.params, req.params);
    if (paramsResult.ok) {
      Object.keys(req.params).forEach((key) => {
        delete req.params[key as keyof typeof req.params];
      });
      Object.assign(req.params, paramsResult.data as typeof req.params);
    }

    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      return next(
        new AppError({
          message: "Validation failed",
          status: 422,
          code: ErrorCodes.VALIDATION_FAILED,
          details: errors,
        }),
      );
    }

    return next();
  };
}

export type { RequestSchemas, ValidationErrors };
export { validateRequest };
