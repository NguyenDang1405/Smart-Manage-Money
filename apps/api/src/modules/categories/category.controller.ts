import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../shared/response";
import { CategoryService } from "./category.service";
import { createCategorySchema } from "./category.schema";

async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new Error("User ID not found");

    const validatedData = createCategorySchema.parse(req.body);
    const result = await CategoryService.createCategory(userId, validatedData);

    ApiResponse.created(res, result, "Category created successfully");
  } catch (error) {
    next(error);
  }
}

async function getCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new Error("User ID not found");

    const result = await CategoryService.getCategories(userId);
    ApiResponse.ok(res, result, "Categories retrieved successfully");
  } catch (error) {
    next(error);
  }
}

export const CategoryController = {
  createCategory,
  getCategories,
};
