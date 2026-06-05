import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../shared/response";
import { DashboardService } from "./dashboard.service";
import { getDashboardSummaryQuerySchema, getDashboardTrendQuerySchema, getDashboardCompareQuerySchema } from "./dashboard.schema";
import { AppError } from "../../shared/app-error";

async function getDashboardSummary(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const validatedQuery = getDashboardSummaryQuerySchema.parse(req.query);
    const result = await DashboardService.getDashboardSummary(req.user.userId, validatedQuery);

    ApiResponse.ok(res, result, "Dashboard summary retrieved successfully");
  } catch (error) {
    next(error);
  }
}

async function getTrend(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const validatedQuery = getDashboardTrendQuerySchema.parse(req.query);
    const result = await DashboardService.getTrend(req.user.userId, validatedQuery);

    ApiResponse.ok(res, result, "Dashboard trend retrieved successfully");
  } catch (error) {
    next(error);
  }
}

async function getCompare(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({ message: "Unauthorized", status: 401, code: "UNAUTHORIZED" });
    }

    const validatedQuery = getDashboardCompareQuerySchema.parse(req.query);
    const result = await DashboardService.getCompare(req.user.userId, validatedQuery);

    ApiResponse.ok(res, result, "Dashboard comparison retrieved successfully");
  } catch (error) {
    next(error);
  }
}

export const DashboardController = {
  getDashboardSummary,
  getTrend,
  getCompare,
};
