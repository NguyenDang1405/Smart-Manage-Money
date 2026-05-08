import type { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../shared/response";
import { TransactionService } from "./transactions.service";
import { getTransactionsQuerySchema, createTransactionSchema, updateTransactionSchema, bulkCreateTransactionSchema } from "./transactions.schema";
import { AppError } from "../../shared/app-error";

async function getTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const validatedQuery = getTransactionsQuerySchema.parse(req.query);
    const result = await TransactionService.getTransactions(req.user.userId, validatedQuery);

    ApiResponse.ok(res, result.data, "Transactions retrieved successfully", {
      ...result.pagination,
      stats: result.meta,
    });
  } catch (error) {
    next(error);
  }
}

async function createTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const validatedBody = createTransactionSchema.parse(req.body);
    const reqFile = (req as any).file as Express.Multer.File | undefined;
    const receiptUrl = reqFile ? `/uploads/${reqFile.filename}` : undefined;

    const result = await TransactionService.createTransaction(
      req.user.userId,
      validatedBody,
      receiptUrl
    );

    ApiResponse.created(res, result, "Transaction created successfully");
  } catch (error) {
    next(error);
  }
}

async function updateTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const id = req.params.id as string;
    if (!id) {
      throw new AppError({
        message: "Invalid transaction ID",
        status: 400,
        code: "BAD_REQUEST",
      });
    }

    const validatedBody = updateTransactionSchema.parse(req.body);
    const reqFile = (req as any).file as Express.Multer.File | undefined;
    let receiptUrl: string | null | undefined = undefined;
    if (reqFile) {
      receiptUrl = `/uploads/${reqFile.filename}`;
    } else if (req.body.deleteReceipt === 'true') {
      receiptUrl = null;
    }

    const result = await TransactionService.updateTransaction(
      id,
      req.user.userId,
      validatedBody,
      receiptUrl
    );

    ApiResponse.ok(res, result, "Transaction updated successfully");
  } catch (error) {
    next(error);
  }
}

async function deleteTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const id = req.params.id as string;
    if (!id) {
      throw new AppError({
        message: "Invalid transaction ID",
        status: 400,
        code: "BAD_REQUEST",
      });
    }

    await TransactionService.deleteTransaction(id, req.user.userId);

    ApiResponse.ok(res, null, "Transaction deleted successfully");
  } catch (error) {
    next(error);
  }
}

async function importTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const reqFile = (req as any).file as Express.Multer.File | undefined;
    if (!reqFile) {
      throw new AppError({
        message: "CSV file is required",
        status: 400,
        code: "BAD_REQUEST",
      });
    }

    const previewOnly = req.body.preview === 'true';

    const result = await TransactionService.importTransactions(
      req.user.userId,
      reqFile.path,
      previewOnly
    );

    ApiResponse.ok(res, result, previewOnly ? "Preview generated successfully" : "Transactions imported successfully");
  } catch (error) {
    next(error);
  }
}

async function bulkCreate(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError({
        message: "Unauthorized",
        status: 401,
        code: "UNAUTHORIZED",
      });
    }

    const { transactions } = bulkCreateTransactionSchema.parse(req.body);
    
    // Convert to BulkCreateTransactionInput structure
    const mappedTransactions = transactions.map(t => ({
      ...t,
      categoryId: t.categoryId ?? undefined, // Convert null to undefined if needed, or modify service to accept null
    }));

    const result = await TransactionService.createMany(req.user.userId, mappedTransactions as any);

    ApiResponse.created(res, result, "Transactions created successfully");
  } catch (error) {
    next(error);
  }
}

export const TransactionController = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
  bulkCreate,
};
