import { prisma } from "../../shared/prisma";
import type { Prisma } from "@prisma/client";

async function findMany(where: Prisma.BudgetWhereInput) {
  return prisma.budget.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: {
      category: {
        name: "asc",
      },
    },
  });
}

async function findUnique(userId: string, categoryId: number, month: number, year: number) {
  return prisma.budget.findUnique({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId,
        month,
        year,
      },
    },
    include: {
      category: true,
    },
  });
}

async function upsert(userId: string, data: { categoryId: number; amount: number; month: number; year: number }) {
  const { categoryId, amount, month, year } = data;
  return prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId,
        month,
        year,
      },
    },
    update: {
      amount,
    },
    create: {
      userId,
      categoryId,
      amount,
      month,
      year,
    },
    include: {
      category: true,
    },
  });
}

export const BudgetRepository = {
  findMany,
  findUnique,
  upsert,
};
