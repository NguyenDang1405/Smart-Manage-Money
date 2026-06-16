import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../shared/response";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { AppError } from "../../shared/app-error";
import { registerSchema, loginSchema, googleLoginSchema } from "./auth.schema";

async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = registerSchema.parse(req.body);
    const result = await AuthService.register(validatedData);

    ApiResponse.created(res, result, "User registered successfully");
  } catch (error) {
    next(error);
  }
}

async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = loginSchema.parse(req.body);
    const result = await AuthService.login(validatedData);

    ApiResponse.ok(res, result, "Login successful");
  } catch (error) {
    next(error);
  }
}

async function googleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = googleLoginSchema.parse(req.body);
    const result = await AuthService.googleLogin(validatedData);

    ApiResponse.ok(res, result, "Google login successful");
  } catch (error) {
    next(error);
  }
}

async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }
    const user = await AuthRepository.getUserByEmail(req.user.email);
    if (!user) {
      throw new AppError({
        message: "User not found",
        status: 404,
        code: "NOT_FOUND",
      });
    }
    const { passwordHash: _, ...userWithoutPassword } = user;
    ApiResponse.ok(res, { user: userWithoutPassword }, "Authenticated user info");
  } catch (error) {
    next(error);
  }
}

export const AuthController = {
  register,
  login,
  googleLogin,
  getMe,
};
