import { prisma } from "../../shared/prisma";
import { AppError } from "../../shared/app-error";
import bcrypt from "bcryptjs";
import type { UpdateProfileInput, UpdateSecurityInput } from "./users.schema";
import type { Prisma } from "@prisma/client";

async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      isEmailVerified: true,
      fullName: true,
      alias: true,
      dateOfBirth: true,
      gender: true,
      phoneNumber: true,
      avatarUrl: true,
      monthlyIncome: true,
      currency: true,
      financialGoals: true,
      biometricEnabled: true,
      connectedDevices: true,
      createdAt: true,
      transactions: {
        select: {
          id: true,
          amount: true,
          type: true,
        }
      }
    },
  });

  if (!user) {
    throw new AppError({ message: "User not found", status: 404, code: "NOT_FOUND" });
  }

  // Calculate streak and total saved
  // For demo/simplicity, we just return the counts
  // A real implementation of 'streak' might require more complex queries
  const transactionCount = user.transactions.length;
  
  const totalSaved = user.transactions
    .filter(t => t.type === 'saving')
    .reduce((sum, t) => sum + Number(t.amount), 0);
    
  // Mock streak for now
  const streak = 14; 

  const { transactions, ...userProfile } = user;

  return {
    ...userProfile,
    stats: {
      transactionCount,
      totalSaved,
      streak
    }
  };
}

function parseDate(dateStr: string | Date): Date | null {
  if (dateStr instanceof Date) return dateStr;
  if (!dateStr) return null;
  
  const clean = String(dateStr).trim();
  if (!clean) return null;
  
  // Try direct parsing first
  let parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // Try YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1; // 0-indexed
    const day = parseInt(ymdMatch[3], 10);
    parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

async function updateProfile(userId: string, data: UpdateProfileInput, avatarUrl?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError({ message: "User not found", status: 404, code: "NOT_FOUND" });
  }

  const { dateOfBirth, ...rest } = data;
  const updatedData: Prisma.UserUpdateInput = { ...rest };
  
  if (dateOfBirth !== undefined) {
    if (dateOfBirth === null || dateOfBirth === "") {
      updatedData.dateOfBirth = null;
    } else {
      const parsedDate = parseDate(dateOfBirth);
      if (parsedDate) {
        updatedData.dateOfBirth = parsedDate;
      } else {
        throw new AppError({ message: "Ngày sinh không hợp lệ. Vui lòng nhập định dạng YYYY-MM-DD hoặc DD/MM/YYYY", status: 400, code: "BAD_REQUEST" });
      }
    }
  }
  
  if (avatarUrl !== undefined) {
    updatedData.avatarUrl = avatarUrl;
  }

  // Update in Clerk if fullName is updated
  if (data.fullName && user.clerkId) {
    try {
      const { clerkClient } = await import("@clerk/express");
      await clerkClient.users.updateUser(user.clerkId, {
        firstName: data.fullName.split(' ')[0] || '',
        lastName: data.fullName.split(' ').slice(1).join(' ') || '',
      });
    } catch (clerkErr) {
      console.warn("Could not sync profile update to Clerk:", clerkErr);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updatedData,
    select: {
      id: true,
      email: true,
      fullName: true,
      alias: true,
      dateOfBirth: true,
      gender: true,
      phoneNumber: true,
      avatarUrl: true,
      monthlyIncome: true,
      currency: true,
      financialGoals: true,
      createdAt: true,
    },
  });

  return updatedUser;
}

async function updateSecurity(userId: string, data: UpdateSecurityInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError({ message: "User not found", status: 404, code: "NOT_FOUND" });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      biometricEnabled: true,
      connectedDevices: true,
    },
  });

  return updatedUser;
}


async function changePassword(userId: string, data: any) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError({ message: "User not found", status: 404, code: "NOT_FOUND" });
  }

  const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError({ message: "Current password is incorrect", status: 400, code: "BAD_REQUEST" });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.newPassword, salt);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { message: "Password updated successfully" };
}

export const UsersService = {
  getProfile,
  updateProfile,
  updateSecurity,
  changePassword,
};

// Refactored: fix(users): resolve profile picture upload resizing issue

// Refactored: fix(users): resolve profile picture upload resizing issue
