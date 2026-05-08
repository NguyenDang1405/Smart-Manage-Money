import { z } from "zod";

export const getTransactionsQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
  type: z.enum(["income", "expense", "saving", "savings"]).optional(),
  categoryId: z.string().transform((val) => parseInt(val, 10)).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  categories: z.string().optional(),
});

export const createTransactionSchema = z.object({
  type: z.enum(["income", "expense", "saving", "savings"]),
  amount: z.string().transform((val) => parseFloat(val)),
  category: z.string().optional(),
  categoryId: z.string().transform((val) => parseInt(val, 10)).optional(),
  date: z.string().optional(),
  note: z.string().optional(),
  description: z.string().optional(),
  aiSuggestedCategoryId: z.string().transform((val) => parseInt(val, 10)).optional(),
  aiConfidence: z.string().transform((val) => parseFloat(val)).optional(),
});

export const updateTransactionSchema = z.object({
  type: z.enum(["income", "expense", "saving", "savings"]).optional(),
  amount: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
  category: z.string().optional(),
  categoryId: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  date: z.string().optional(),
  note: z.string().optional(),
  description: z.string().optional(),
  aiSuggestedCategoryId: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  aiConfidence: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
});

export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const bulkCreateTransactionSchema = z.object({
  transactions: z.array(
    z.object({
      type: z.enum(["income", "expense", "saving", "savings"]),
      amount: z.number().positive(),
      categoryId: z.number().optional().nullable(),
      date: z.string(),
      description: z.string(),
      aiSuggestedCategoryId: z.number().optional().nullable(),
      aiConfidence: z.number().optional().nullable(),
    })
  )
});

