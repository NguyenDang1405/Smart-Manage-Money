import { prisma } from "../../shared/prisma";
import type { CreateTransactionInput } from "./transaction.schema";

async function createTransaction(userId: string, data: CreateTransactionInput) {
  return await prisma.transaction.create({
    data: {
      userId,
      amount: data.amount as number, // Cast to number after parsing
      type: data.type,
      categoryId: data.categoryId,
      goalId: data.goalId,
      description: data.description,
      note: data.note,
      transactionDate: data.transactionDate,
      receiptUrl: data.receiptUrl,
      source: data.source,
    },
    include: {
      category: true,
    },
  });
}

export const TransactionRepository = {
  createTransaction,
};
