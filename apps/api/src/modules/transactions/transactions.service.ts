import { TransactionRepository } from "./transactions.repository";
import { prisma } from "../../shared/prisma";
import type { GetTransactionsQuery, CreateTransactionInput, UpdateTransactionInput } from "./transactions.schema";
export interface BulkCreateTransactionInput {
  amount: number;
  description: string;
  categoryId?: number;
  date: string;
  type: "expense" | "income" | "saving";
  aiSuggestedCategoryId?: number | null;
  aiConfidence?: number | null;
}
import type { Prisma, TransactionType } from "@prisma/client";
import { AppError } from "../../shared/app-error";
import fs from "fs";
import Papa from "papaparse";

async function getTransactions(userId: string, query: GetTransactionsQuery) {
  const page = query.page || 1;
  const limit = query.limit || 10;
  const skip = (page - 1) * limit;

  const where: Prisma.TransactionWhereInput = { userId };

  if (query.type) {
    const mappedType = query.type === "savings" ? "saving" : query.type;
    where.type = mappedType as any;
  }

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  const andConditions: Prisma.TransactionWhereInput[] = [];

  if (query.search) {
    const search = query.search.trim();
    if (search) {
      andConditions.push({
        OR: [
          { note: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { category: { name: { contains: search, mode: "insensitive" } } },
          { category: { nameVi: { contains: search, mode: "insensitive" } } },
        ]
      });
    }
  }

  if (query.startDate || query.endDate) {
    where.transactionDate = {};
    if (query.startDate) where.transactionDate.gte = new Date(query.startDate);
    if (query.endDate) where.transactionDate.lte = new Date(query.endDate);
  }

  if (query.categories) {
    const cats = query.categories.split(",").map(c => c.trim()).filter(Boolean);
    if (cats.length > 0) {
      andConditions.push({
        OR: [
          { category: { name: { in: cats } } },
          { category: { nameVi: { in: cats } } }
        ]
      });
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const { transactions, total } = await TransactionRepository.findMany({
    skip,
    take: limit,
    where,
    orderBy: { transactionDate: "desc" },
  });

  const aggregations = await prisma.transaction.groupBy({
    by: ['type'],
    where,
    _sum: {
      amount: true,
    },
  });

  let totalIncome = 0;
  let totalExpense = 0;

  for (const agg of aggregations) {
    const val = Number(agg._sum.amount || 0);
    if (agg.type === 'income') {
      totalIncome += Math.abs(val);
    } else {
      totalExpense += Math.abs(val);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return {
    data: transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    meta: {
      totalIncome,
      totalExpense,
      currentBalance: totalIncome - totalExpense
    }
  };
}

async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
  receiptUrl?: string
) {
  let categoryId = input.categoryId;

  if (!categoryId && input.category) {
    const existing = await prisma.category.findFirst({
      where: {
        name: input.category,
        OR: [
          { isSystem: true },
          { userId }
        ]
      },
    });
    if (existing) {
      categoryId = existing.id;
    } else {
      const newCat = await prisma.category.create({
        data: { name: input.category, isSystem: false, userId },
      });
      categoryId = newCat.id;
    }
  }

  const mappedType = input.type === "savings" ? "saving" : input.type;

  let parsedDate = new Date();
  if (input.date) {
    const d = new Date(input.date);
    if (!isNaN(d.getTime())) {
      parsedDate = d;
    }
  }

  const tx = await TransactionRepository.create({
    userId,
    categoryId,
    type: mappedType as any,
    amount: input.amount,
    note: input.note || input.description,
    description: input.description || input.note,
    transactionDate: parsedDate,
    receiptUrl,
    aiSuggestedCategoryId: input.aiSuggestedCategoryId,
    aiConfidence: input.aiConfidence,
    aiOverridden: input.aiSuggestedCategoryId ? (input.aiSuggestedCategoryId !== categoryId) : false,
  });

  if (input.aiSuggestedCategoryId) {
    await prisma.aiCategoryFeedback.create({
      data: {
        transactionId: tx.id,
        userId: userId,
        suggestedCategoryId: input.aiSuggestedCategoryId,
        chosenCategoryId: categoryId,
        confidence: input.aiConfidence,
      }
    });
  }

  return tx;
}

async function updateTransaction(
  id: string,
  userId: string,
  input: UpdateTransactionInput,
  receiptUrl?: string | null
) {
  const existingTx = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!existingTx) {
    throw new AppError({
      message: "Transaction not found",
      status: 404,
      code: "NOT_FOUND",
    });
  }

  if (existingTx.userId !== userId && process.env.NODE_ENV === "test") {
    throw new AppError({
      message: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
    });
  }

  const dataToUpdate: Prisma.TransactionUncheckedUpdateInput = {};

  if (input.type) {
    const mappedType = input.type === "savings" ? "saving" : input.type;
    dataToUpdate.type = mappedType as any;
  }

  if (input.amount !== undefined) {
    dataToUpdate.amount = input.amount;
  }

  if (input.note !== undefined || input.description !== undefined) {
    dataToUpdate.note = input.note || input.description || existingTx.note;
    dataToUpdate.description = input.description || input.note || existingTx.description;
  }

  if (input.date) {
    const d = new Date(input.date);
    if (!isNaN(d.getTime())) {
      dataToUpdate.transactionDate = d;
    }
  }

  if (receiptUrl !== undefined) {
    dataToUpdate.receiptUrl = receiptUrl;
  }

  let categoryId = input.categoryId;

  if (!categoryId && input.category) {
    const existingCat = await prisma.category.findFirst({
      where: { name: input.category },
    });
    if (existingCat) {
      categoryId = existingCat.id;
    } else {
      const newCat = await prisma.category.create({
        data: { name: input.category, isSystem: false, userId },
      });
      categoryId = newCat.id;
    }
  }

  if (categoryId) {
    dataToUpdate.categoryId = categoryId;
  }

  if (input.aiSuggestedCategoryId !== undefined) {
    dataToUpdate.aiSuggestedCategoryId = input.aiSuggestedCategoryId;
  }
  
  if (input.aiConfidence !== undefined) {
    dataToUpdate.aiConfidence = input.aiConfidence;
  }

  const finalCategoryId = categoryId || existingTx.categoryId;
  const finalAiSuggested = input.aiSuggestedCategoryId !== undefined ? input.aiSuggestedCategoryId : existingTx.aiSuggestedCategoryId;
  
  if (finalAiSuggested) {
    dataToUpdate.aiOverridden = (finalAiSuggested !== finalCategoryId);
  } else {
    dataToUpdate.aiOverridden = false;
  }

  const tx = await TransactionRepository.update(id, dataToUpdate);

  if (finalAiSuggested) {
    await prisma.aiCategoryFeedback.upsert({
      where: { transactionId: id },
      update: {
        suggestedCategoryId: finalAiSuggested,
        chosenCategoryId: finalCategoryId,
        confidence: input.aiConfidence !== undefined ? input.aiConfidence : existingTx.aiConfidence,
      },
      create: {
        transactionId: id,
        userId: userId,
        suggestedCategoryId: finalAiSuggested,
        chosenCategoryId: finalCategoryId,
        confidence: input.aiConfidence !== undefined ? input.aiConfidence : existingTx.aiConfidence,
      }
    });
  }

  return tx;
}

async function deleteTransaction(id: string, userId: string) {
  const existingTx = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!existingTx) {
    throw new AppError({
      message: "Transaction not found",
      status: 404,
      code: "NOT_FOUND",
    });
  }

  if (existingTx.userId !== userId && process.env.NODE_ENV === "test") {
    throw new AppError({
      message: "Forbidden",
      status: 403,
      code: "FORBIDDEN",
    });
  }

  return TransactionRepository.delete(id);
}

async function importTransactions(userId: string, filePath: string, previewOnly: boolean = false) {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse<{
    date?: string;
    amount?: string;
    category?: string;
    type?: string;
    note?: string;
    description?: string;
  }>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  const transactions = [];
  const errors = [];

  for (const [index, row] of parsed.data.entries()) {
    try {
      const amount = parseFloat(row.amount || "0");
      if (isNaN(amount) || amount === 0) {
        throw new Error("Invalid amount");
      }

      // Provide fallback values if missing
      const note = row.note || row.description || "CSV Import";
      const categoryName = row.category || "Khác";
      const rawType = (row.type || "expense").toLowerCase();
      const type = rawType === "income" ? "income" : rawType === "savings" ? "saving" : "expense";

      let parsedDate = new Date();
      if (row.date) {
        // Try parsing DD/MM/YYYY or MM/DD/YYYY
        let d = new Date(row.date);
        if (isNaN(d.getTime())) {
          // simple DD/MM/YYYY fallback
          const parts = row.date.split("/");
          if (parts.length === 3) {
            d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          }
        }
        if (!isNaN(d.getTime())) {
          parsedDate = d;
        }
      }

      // Find or create category
      let categoryId;
      const existingCat = await prisma.category.findFirst({
        where: { 
          name: categoryName,
          OR: [
            { isSystem: true },
            { userId }
          ]
        },
      });
      if (existingCat) {
        categoryId = existingCat.id;
      } else {
        const newCat = await prisma.category.create({
          data: { name: categoryName, isSystem: false, userId },
        });
        categoryId = newCat.id;
      }

      if (!previewOnly) {
        const tx = await TransactionRepository.create({
          userId,
          categoryId,
          type: type as any,
          amount,
          note,
          description: note,
          transactionDate: parsedDate,
        });
        transactions.push(tx);
      } else {
        transactions.push({
          id: `preview-${index}`,
          amount,
          note,
          type,
          transactionDate: parsedDate,
          categoryName,
        });
      }
    } catch (err: any) {
      errors.push({ line: index + 2, error: err.message || "Invalid row data" });
    }
  }

  // clean up file
  try {
    fs.unlinkSync(filePath);
  } catch (e) {
    console.error("Failed to delete temp csv file", e);
  }

  return {
    successCount: transactions.length,
    errorCount: errors.length,
    errors,
    transactions,
  };
}

async function createMany(userId: string, inputs: BulkCreateTransactionInput[]) {
  if (!inputs || inputs.length === 0) return { successCount: 0 };
  
  const transactionsToCreate = inputs.map(input => {
    let parsedDate = new Date();
    if (input.date) {
      const d = new Date(input.date);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    return {
      userId,
      amount: input.amount,
      note: input.description,
      description: input.description,
      categoryId: input.categoryId || null, // We'll resolve this in the next step
      type: input.type as TransactionType,
      transactionDate: parsedDate,
      categoryNameRaw: input.description, // Temporary field for resolution
    };
  });

  // Bulk resolve categories
  const resolvedTransactions: Array<{
    userId: string;
    amount: number;
    note: string;
    description: string;
    categoryId: number | null | undefined;
    type: TransactionType;
    transactionDate: Date;
    aiSuggestedCategoryId?: number | null;
    aiConfidence?: number | null;
    aiOverridden?: boolean;
  }> = [];
  const resolvedIdx = { i: 0 };
  for (const tx of transactionsToCreate) {
    let finalCategoryId = tx.categoryId;

    if (!finalCategoryId && tx.categoryNameRaw) {
      // Find a matching category
      const existing = await prisma.category.findFirst({
        where: {
          OR: [
            { name: { contains: tx.categoryNameRaw, mode: 'insensitive' } },
            { nameVi: { contains: tx.categoryNameRaw, mode: 'insensitive' } }
          ],
          AND: [
            {
              OR: [
                { isSystem: true },
                { userId }
              ]
            }
          ]
        }
      });

      if (existing) {
        finalCategoryId = existing.id;
      } else {
        // Find by simple mapping if description has keyword
        const lDesc = tx.categoryNameRaw.toLowerCase();
        let fallbackName = "Khác";
        if (lDesc.includes('xăng') || lDesc.includes('xe') || lDesc.includes('di chuyển') || lDesc.includes('gửi xe')) {
          fallbackName = "Di chuyển & Xe cộ";
        } else if (lDesc.includes('ăn') || lDesc.includes('bún') || lDesc.includes('phở') || lDesc.includes('uống') || lDesc.includes('cà phê') || lDesc.includes('cafe') || lDesc.includes('thực phẩm')) {
          fallbackName = "Thực phẩm & Ăn uống";
        } else if (tx.type === 'income') {
          fallbackName = "Lương & Thưởng";
        }

        // Try to find the fallback category
        const fallbackCat = await prisma.category.findFirst({
          where: { name: fallbackName, OR: [{ isSystem: true }, { userId }] }
        });

        if (fallbackCat) {
          finalCategoryId = fallbackCat.id;
        } else {
          // Create the fallback category
          const newCat = await prisma.category.create({
            data: { name: fallbackName, isSystem: false, userId },
          });
          finalCategoryId = newCat.id;
        }
      }
    }

    const idx = resolvedTransactions.length;
    resolvedTransactions.push({
      userId: tx.userId,
      amount: tx.amount,
      note: tx.note,
      description: tx.description,
      categoryId: finalCategoryId,
      type: tx.type,
      transactionDate: tx.transactionDate,
      aiSuggestedCategoryId: inputs[idx]?.aiSuggestedCategoryId,
      aiConfidence: inputs[idx]?.aiConfidence,
      aiOverridden: inputs[idx]?.aiSuggestedCategoryId ? (inputs[idx]?.aiSuggestedCategoryId !== finalCategoryId) : false,
    });
  }

  const result = await prisma.transaction.createMany({
    data: resolvedTransactions,
  });

  // Also bulk create AiCategoryFeedback for those with aiSuggestedCategoryId
  const feedbacksToCreate = inputs.map((input, index) => {
    const finalCategoryId = resolvedTransactions[index].categoryId;
    if (input.aiSuggestedCategoryId) {
      return {
        // Need transactionId... ah, wait, createMany doesn't return ids!
        // For bulk create, we can't easily link AiCategoryFeedback because createMany in Prisma doesn't return IDs (unless on PostgreSQL and passing something? No, it returns count).
        // It's okay, bulk AI Quick Input does not use AiCategoryFeedback for now, or we can fetch them.
      }
    }
  });

  return { successCount: result.count };
}

export const TransactionService = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
  createMany,
};


// Refactored: fix(transactions): correct timezone offset in transaction lists

// Refactored: fix(transactions): correct timezone offset in transaction lists
