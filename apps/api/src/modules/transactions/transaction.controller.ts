import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../shared/response";
import { TransactionService } from "./transaction.service";
import { createTransactionSchema } from "./transaction.schema";

async function createTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error("User ID not found in request");
    }

    const validatedData = createTransactionSchema.parse(req.body);
    const result = await TransactionService.createTransaction(userId, validatedData);

    ApiResponse.created(res, result, "Transaction created successfully");
  } catch (error) {
    next(error);
  }
}

export const TransactionController = {
  createTransaction,
};
