import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionService } from "./transaction.service";
import { TransactionRepository } from "./transaction.repository";
import { prisma } from "../../shared/prisma";
import { AppError } from "../../shared/app-error";

vi.mock("./transaction.repository", () => ({
  TransactionRepository: {
    createTransaction: vi.fn(),
  },
}));

vi.mock("../../shared/prisma", () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
    },
  },
}));

describe("TransactionService - createTransaction", () => {
  const userId = "user-uuid-123";
  const validData: any = {
    amount: 1000,
    type: "expense",
    categoryId: 1,
    transactionDate: new Date(),
    description: "Test transaction",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a transaction successfully if category is system-wide", async () => {
    const mockedCategory = { id: 1, isSystem: true, userId: null };
    const mockedTransaction = { id: "tx-1", ...validData, userId };

    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockedCategory as any);
    vi.mocked(TransactionRepository.createTransaction).mockResolvedValue(mockedTransaction as any);

    const result = await TransactionService.createTransaction(userId, validData);

    expect(prisma.category.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(TransactionRepository.createTransaction).toHaveBeenCalledWith(userId, validData);
    expect(result).toEqual(mockedTransaction);
  });

  it("should handle shorthand amount string (e.g., '50k')", async () => {
    const inputWithShorthand = { ...validData, amount: "50k" };
    const mockedCategory = { id: 1, isSystem: true, userId: null };
    const mockedTransaction = { id: "tx-2", ...validData, amount: 50000, userId };

    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockedCategory as any);
    vi.mocked(TransactionRepository.createTransaction).mockResolvedValue(mockedTransaction as any);

    const result = await TransactionService.createTransaction(userId, inputWithShorthand);

    expect(TransactionRepository.createTransaction).toHaveBeenCalledWith(userId, expect.objectContaining({
      amount: 50000
    }));
    expect(result.amount).toBe(50000);
  });

  it("should throw 404 AppError if category does not exist", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    await expect(TransactionService.createTransaction(userId, validData)).rejects.toThrow(
      new AppError({
        message: "Category not found",
        status: 404,
        code: "NOT_FOUND",
      })
    );
  });

  it("should throw 403 AppError if category belongs to another user", async () => {
    const mockedCategory = { id: 1, isSystem: false, userId: "other-user-uuid" };
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockedCategory as any);

    await expect(TransactionService.createTransaction(userId, validData)).rejects.toThrow(
      new AppError({
        message: "You do not have permission to use this category",
        status: 403,
        code: "FORBIDDEN",
      })
    );
  });
});
