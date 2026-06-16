import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  fullName: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const googleLoginSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  fullName: z.string().trim().optional(),
  avatarUrl: z.string().optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

