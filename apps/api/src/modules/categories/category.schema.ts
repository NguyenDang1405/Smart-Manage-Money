import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  nameVi: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
