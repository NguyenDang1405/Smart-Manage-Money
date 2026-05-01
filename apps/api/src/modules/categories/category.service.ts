import { CategoryRepository } from "./category.repository";
import type { CreateCategoryInput } from "./category.schema";

async function createCategory(userId: string, data: CreateCategoryInput) {
  return await CategoryRepository.createCategory(userId, data);
}

async function getCategories(userId: string) {
  return await CategoryRepository.getCategories(userId);
}

export const CategoryService = {
  createCategory,
  getCategories,
};

// Refactored: feat(categories): add default financial categories on user registration
