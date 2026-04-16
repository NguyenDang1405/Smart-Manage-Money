import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { authenticate } from "./auth.middleware";
import { JWTUtils } from "../shared/jwt";
import { AppError } from "../shared/app-error";

vi.mock("../shared/jwt", () => ({
  JWTUtils: {
    verifyToken: vi.fn(),
  },
}));

describe("AuthMiddleware - authenticate", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: any;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {};
    next = vi.fn();
    vi.clearAllMocks();
  });

  it("should proceed if token is valid", () => {
    const payload = { userId: "1", email: "a@b.com" };
    req.headers!.authorization = "Bearer valid_token";
    
    vi.mocked(JWTUtils.verifyToken).mockReturnValue({
      valid: true,
      expired: false,
      payload: payload as any,
    });

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual(payload);
  });

  it("should throw 401 UNAUTHORIZED if authorization header is missing", () => {
    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      })
    );
  });

  it("should throw 401 TOKEN_EXPIRED if token is expired", () => {
    req.headers!.authorization = "Bearer expired_token";
    
    vi.mocked(JWTUtils.verifyToken).mockReturnValue({
      valid: false,
      expired: true,
      payload: null,
    });

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        code: "TOKEN_EXPIRED",
      })
    );
  });

  it("should throw 401 UNAUTHORIZED if token is invalid", () => {
    req.headers!.authorization = "Bearer invalid_token";
    
    vi.mocked(JWTUtils.verifyToken).mockReturnValue({
      valid: false,
      expired: false,
      payload: null,
    });

    authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Invalid authentication token",
      })
    );
  });
});
