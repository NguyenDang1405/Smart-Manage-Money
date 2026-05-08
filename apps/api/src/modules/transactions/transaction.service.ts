import { TransactionRepository } from "./transaction.repository";
import type { CreateTransactionInput } from "./transaction.schema";
import { AppError } from "../../shared/app-error";
import { prisma } from "../../shared/prisma";
import { parseVietnameseAmount } from "../../shared/amount-parser";

async function createTransaction(userId: string, data: CreateTransactionInput) {
  // If categoryId is provided, verify it exists and is either system or belongs to the user
  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new AppError({
        message: "Category not found",
        status: 404,
        code: "NOT_FOUND",
      });
    }

    if (!category.isSystem && category.userId !== userId) {
      throw new AppError({
        message: "You do not have permission to use this category",
        status: 403,
        code: "FORBIDDEN",
      });
    }
  }

  // Parse shorthand amount (e.g., "50k" -> 50000)
  const parsedAmount = parseVietnameseAmount(data.amount);
  
  if (parsedAmount <= 0) {
    throw new AppError({
      message: "Amount must be greater than 0",
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  return await TransactionRepository.createTransaction(userId, {
    ...data,
    amount: parsedAmount,
  });
}

export const TransactionService = {
  createTransaction,
};
