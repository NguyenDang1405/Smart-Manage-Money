import { z } from "zod";

export const upsertBudgetSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  category: z.string().optional(),
  amount: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

export const getBudgetsQuerySchema = z.object({
  month: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  year: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
});

export type UpsertBudgetInput = z.infer<typeof upsertBudgetSchema>;
export type GetBudgetsQuery = z.infer<typeof getBudgetsQuerySchema>;
