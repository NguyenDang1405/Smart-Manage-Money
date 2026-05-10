import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../shared/response";
import { BudgetService } from "./budgets.service";
import { getBudgetsQuerySchema, upsertBudgetSchema } from "./budgets.schema";
import { AppError } from "../../shared/app-error";

async function getBudgets(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const validatedQuery = getBudgetsQuerySchema.parse(req.query);
    const result = await BudgetService.getBudgets(req.user.userId, validatedQuery);

    ApiResponse.ok(res, result, "Budgets retrieved successfully");
  } catch (error) {
    next(error);
  }
}

async function upsertBudget(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const validatedBody = upsertBudgetSchema.parse(req.body);
    const result = await BudgetService.upsertBudget(req.user.userId, validatedBody);

    ApiResponse.ok(res, result, "Budget set successfully");
  } catch (error) {
    next(error);
  }
}

async function getBudgetSummary(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const validatedQuery = getBudgetsQuerySchema.parse(req.query);
    const result = await BudgetService.getBudgetSummary(req.user.userId, validatedQuery);

    ApiResponse.ok(res, result, "Budget summary retrieved successfully");
  } catch (error) {
    next(error);
  }
}

async function suggestBudgets(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const { month, year } = req.body;
    const result = await BudgetService.suggestBudgetsWithAI(
      req.user.userId,
      month ? Number(month) : undefined,
      year ? Number(year) : undefined
    );
    ApiResponse.ok(res, result, "AI suggested budgets retrieved successfully");
  } catch (error) {
    next(error);
  }
}

export const BudgetController = {
  getBudgets,
  upsertBudget,
  getBudgetSummary,
  suggestBudgets,
};
