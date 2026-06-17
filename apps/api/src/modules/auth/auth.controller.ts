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
    let user = await AuthRepository.getUserByEmail(req.user.email);
    if (!user) {
      throw new AppError({
        message: "User not found",
        status: 404,
        code: "NOT_FOUND",
      });
    }

    // Sync profile from Clerk (avatar, fullName) when user checks their profile
    if (user.clerkId) {
      try {
        const { clerkClient } = await import("@clerk/express");
        const clerkUser = await clerkClient.users.getUser(user.clerkId);
        const clerkFullName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();
        const clerkAvatar = clerkUser.imageUrl || null;
        const needsUpdate =
          (clerkAvatar && clerkAvatar !== user.avatarUrl && !user.avatarUrl?.startsWith('/uploads/')) ||
          (clerkFullName && clerkFullName !== user.fullName);

        if (needsUpdate) {
          const { prisma } = await import("../../shared/prisma");
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              ...(clerkAvatar && clerkAvatar !== user.avatarUrl && !user.avatarUrl?.startsWith('/uploads/') ? { avatarUrl: clerkAvatar } : {}),
              ...(clerkFullName && clerkFullName !== user.fullName ? { fullName: clerkFullName } : {}),
            },
          });
        }
      } catch (syncErr) {
        console.warn("Could not sync Clerk profile:", syncErr);
      }
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
