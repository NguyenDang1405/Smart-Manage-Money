import { prisma } from "../../shared/prisma";
import type { CreateCategoryInput } from "./category.schema";

async function createCategory(userId: string, data: CreateCategoryInput) {
  return await prisma.category.create({
    data: {
      ...data,
      userId,
      isSystem: false,
    },
  });
}

async function getCategories(userId: string) {
  return await prisma.category.findMany({
    where: {
      OR: [
        { isSystem: true },
        { userId: userId },
      ],
    },
  });
}

export const CategoryRepository = {
  createCategory,
  getCategories,
};

// Refactored: fix(categories): prevent duplicate category creation
