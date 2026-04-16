const ErrorCodes = {
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  CONFLICT: "CONFLICT",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
} as const;

type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export type { ErrorCode };
export { ErrorCodes };
