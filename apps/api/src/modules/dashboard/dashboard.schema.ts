import { z } from "zod";

export const getDashboardSummaryQuerySchema = z.object({
  month: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  year: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
});

export const getDashboardTrendQuerySchema = z.object({
  period: z.enum(['week', 'month']).optional().default('month'),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 6)),
  months: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
});

export const getDashboardCompareQuerySchema = z.object({
  m1: z.string(), // Expected format: MM/YYYY or YYYY-MM
  m2: z.string(),
});

export type GetDashboardSummaryQuery = z.infer<typeof getDashboardSummaryQuerySchema>;
export type GetDashboardTrendQuery = z.infer<typeof getDashboardTrendQuerySchema>;
export type GetDashboardCompareQuery = z.infer<typeof getDashboardCompareQuerySchema>;
