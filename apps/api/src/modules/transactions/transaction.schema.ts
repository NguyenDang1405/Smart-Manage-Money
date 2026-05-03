import { z } from "zod";

export const createTransactionSchema = z.object({
  amount: z.preprocess((val) => {
    if (typeof val === "string" || typeof val === "number") return val;
    return val;
  }, z.union([z.number(), z.string()])),
  type: z.enum(["income", "expense", "saving"]),
  categoryId: z.number().int().optional(),
  goalId: z.string().uuid().optional(),
  description: z.string().max(255).optional(),
  note: z.string().optional(),
  transactionDate: z.string().transform((str) => new Date(str)),
  receiptUrl: z.string().optional(),
  source: z.enum(["manual", "ai_quick", "csv_import"]).default("manual"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
