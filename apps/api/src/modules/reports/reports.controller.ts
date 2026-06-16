import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../shared/response";
import { ReportService } from "./reports.service";
import { getMonthlyReportQuerySchema } from "./reports.schema";
import { AppError } from "../../shared/app-error";

async function getMonthlyReport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({ message: "Unauthorized", status: 401, code: "UNAUTHORIZED" });
    }
    const validatedQuery = getMonthlyReportQuerySchema.parse(req.query);
    const result = await ReportService.getMonthlyReport(req.user.userId, validatedQuery);
    ApiResponse.ok(res, result, "Monthly report retrieved successfully");
  } catch (error) {
    next(error);
  }
}

export const ReportController = { getMonthlyReport };
