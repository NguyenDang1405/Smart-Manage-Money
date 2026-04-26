import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../shared/response";
import { UsersService } from "./users.service";
import { updateProfileSchema, updateSecuritySchema, changePasswordSchema } from "./users.schema";
import { AppError } from "../../shared/app-error";

async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) {
      throw new AppError({ message: "Unauthorized", status: 401, code: "UNAUTHORIZED" });
    }
    const profile = await UsersService.getProfile(req.user.userId);
    ApiResponse.ok(res, profile, "User profile retrieved successfully");
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) {
      throw new AppError({ message: "Unauthorized", status: 401, code: "UNAUTHORIZED" });
    }
    
    const bodyData = { ...req.body };
    if (bodyData.monthlyIncome && typeof bodyData.monthlyIncome === 'string') {
      bodyData.monthlyIncome = parseFloat(bodyData.monthlyIncome);
    }
    // Parse JSON string for financialGoals if it comes from form-data
    if (bodyData.financialGoals && typeof bodyData.financialGoals === 'string') {
      try {
        bodyData.financialGoals = JSON.parse(bodyData.financialGoals);
      } catch (e) {
        // keep as is if it fails parsing
      }
    }

    const validatedData = updateProfileSchema.parse(bodyData);
    
    const updatedProfile = await UsersService.updateProfile(req.user.userId, validatedData);
    ApiResponse.ok(res, updatedProfile, "User profile updated successfully");
  } catch (error) {
    next(error);
  }
}

async function uploadAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) {
      throw new AppError({ message: "Unauthorized", status: 401, code: "UNAUTHORIZED" });
    }

    if (!req.file) {
      throw new AppError({ message: "No image file provided", status: 400, code: "BAD_REQUEST" });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    const updatedProfile = await UsersService.updateProfile(req.user.userId, {}, avatarUrl);
    
    ApiResponse.ok(res, { avatarUrl: updatedProfile.avatarUrl }, "Avatar uploaded successfully");
  } catch (error) {
    next(error);
  }
}

async function updateSecurity(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) {
      throw new AppError({ message: "Unauthorized", status: 401, code: "UNAUTHORIZED" });
    }

    const validatedData = updateSecuritySchema.parse(req.body);
    const updatedUser = await UsersService.updateSecurity(req.user.userId, validatedData);
    
    ApiResponse.ok(res, updatedUser, "Security settings updated successfully");
  } catch (error) {
    next(error);
  }
}

async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.userId) {
      throw new AppError({ message: "Unauthorized", status: 401, code: "UNAUTHORIZED" });
    }

    const validatedData = changePasswordSchema.parse(req.body);
    const result = await UsersService.changePassword(req.user.userId, validatedData);
    
    ApiResponse.ok(res, result, "Password updated successfully");
  } catch (error) {
    next(error);
  }
}

export const UsersController = {
  getProfile,
  updateProfile,
  uploadAvatar,
  updateSecurity,
  changePassword,
};
