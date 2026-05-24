import { z } from "zod";

export const getMonthlyReportQuerySchema = z.object({
  month: z.string(), // e.g., "5/2024" or "2024-05"
});

export type GetMonthlyReportQuery = z.infer<typeof getMonthlyReportQuerySchema>;
