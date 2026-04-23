import { z } from "zod";

const genderEnum = z.enum(["male", "female", "other"]);

export const updateProfileSchema = z.object({
  fullName: z.string().min(1, "Full name cannot be empty").optional(),
  alias: z.string().optional(),
  dateOfBirth: z.string().or(z.date()).nullable().optional(),
  gender: genderEnum.optional(),
  phoneNumber: z.string().optional(),
  monthlyIncome: z.number().min(0).optional(),
  currency: z.string().min(1).optional(),
  financialGoals: z.array(z.string()).optional(),
});

export const updateSecuritySchema = z.object({
  biometricEnabled: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSecurityInput = z.infer<typeof updateSecuritySchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
