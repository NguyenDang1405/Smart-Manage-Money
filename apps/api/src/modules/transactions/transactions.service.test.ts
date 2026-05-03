import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransactionService } from "./transactions.service";
import { TransactionRepository } from "./transactions.repository";
import { prisma } from "../../shared/prisma";
import fs from "fs";
import Papa from "papaparse";

vi.mock("fs", () => ({
  default: {
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
  },
}));

vi.mock("papaparse", () => ({
  default: {
    parse: vi.fn(),
  },
}));

vi.mock("./transactions.repository", () => ({
  TransactionRepository: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../../shared/prisma", () => ({
  prisma: {
    category: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    transaction: {
      groupBy: vi.fn(),
    },
  },
}));

describe("TransactionService - getTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve transactions with correct pagination metadata", async () => {
    const mockedTransactions = [
      { id: "tx-1", amount: 1000, note: "Test 1" },
      { id: "tx-2", amount: 2000, note: "Test 2" },
    ] as any;

    vi.mocked(TransactionRepository.findMany).mockResolvedValue({
      transactions: mockedTransactions,
      total: 15,
    });

    // @ts-ignore
    vi.mocked(prisma.transaction.groupBy).mockResolvedValue([
      { type: 'income', _sum: { amount: 5000 } },
      { type: 'expense', _sum: { amount: 2000 } },
    ] as any);

    const result = await TransactionService.getTransactions("user-uuid", {
      page: 2,
      limit: 2,
      type: "expense",
      search: "Test",
    });

    expect(TransactionRepository.findMany).toHaveBeenCalledWith({
      skip: 2,
      take: 2,
      where: {
        userId: "user-uuid",
        type: "expense" as any,
        AND: [
          {
            OR: [
              { note: { contains: "Test", mode: "insensitive" } },
              { description: { contains: "Test", mode: "insensitive" } },
              { category: { name: { contains: "Test", mode: "insensitive" } } },
              { category: { nameVi: { contains: "Test", mode: "insensitive" } } },
            ]
          }
        ]

      },
      orderBy: { transactionDate: "desc" },
    });

    expect(result).toEqual({
      data: mockedTransactions,
      pagination: {
        page: 2,
        limit: 2,
        total: 15,
        totalPages: 8,
        hasNextPage: true,
        hasPrevPage: true,
      },
      meta: {
        totalIncome: 5000,
        totalExpense: 2000,
        currentBalance: 3000,
      }
    });
  });
});

describe("TransactionService - createTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should lookup existing category and create transaction successfully", async () => {
    const createInput = {
      type: "expense" as const,
      amount: 50000 as any,
      category: "Food",
      categoryId: undefined,
      note: "Lunch",
    };

    const mockedCategory = { id: 10, name: "Food" };
    const mockedCreatedTx = { id: "tx-123", amount: 50000, categoryId: 10 } as any;

    vi.mocked(prisma.category.findFirst).mockResolvedValue(mockedCategory as any);
    vi.mocked(TransactionRepository.create).mockResolvedValue(mockedCreatedTx);

    const result = await TransactionService.createTransaction("user-uuid", createInput, "/uploads/receipt.jpg");

    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: {
        name: "Food",
        OR: [
          { isSystem: true },
          { userId: "user-uuid" }
        ]
      },
    });
    expect(TransactionRepository.create).toHaveBeenCalledWith({
      userId: "user-uuid",
      categoryId: 10,
      type: "expense",
      amount: 50000,
      note: "Lunch",
      description: "Lunch",
      transactionDate: expect.any(Date),
      receiptUrl: "/uploads/receipt.jpg",
    });
    expect(result).toEqual(mockedCreatedTx);
  });
});

describe("TransactionService - importTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should parse csv, create valid transactions, and collect errors", async () => {
    vi.mocked(fs.readFileSync).mockReturnValue("dummy,csv");
    vi.mocked(Papa.parse).mockReturnValue({
      data: [
        { amount: "500", note: "Valid", category: "Food", type: "expense", date: "01/05/2026" },
        { amount: "invalid", note: "Invalid amount" }, // Invalid
        { amount: "0", note: "Zero amount" }, // Invalid
      ],
    } as any);

    vi.mocked(prisma.category.findFirst).mockResolvedValue({ id: 10, name: "Food" } as any);
    vi.mocked(TransactionRepository.create).mockResolvedValue({ id: "tx-1", amount: 500 } as any);

    const result = await TransactionService.importTransactions("user-uuid", "path/to/file.csv", false);

    expect(fs.readFileSync).toHaveBeenCalledWith("path/to/file.csv", "utf8");
    expect(Papa.parse).toHaveBeenCalled();
    expect(prisma.category.findFirst).toHaveBeenCalledWith({ where: { name: "Food" } });
    expect(TransactionRepository.create).toHaveBeenCalledTimes(1);
    expect(fs.unlinkSync).toHaveBeenCalledWith("path/to/file.csv");

    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].error).toBe("Invalid amount");
  });

  it("should return preview data correctly without creating transactions when previewOnly is true", async () => {
    vi.mocked(fs.readFileSync).mockReturnValue("dummy,csv");
    vi.mocked(Papa.parse).mockReturnValue({
      data: [
        { amount: "1500", note: "Preview", category: "Salary", type: "income" },
      ],
    } as any);

    vi.mocked(prisma.category.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.category.create).mockResolvedValue({ id: 20, name: "Salary" } as any);

    const result = await TransactionService.importTransactions("user-uuid", "path/to/file.csv", true);

    expect(TransactionRepository.create).not.toHaveBeenCalled();
    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(0);
    expect(result.transactions[0].amount).toBe(1500);
    expect(result.transactions[0].note).toBe("Preview");
    expect(result.transactions[0].type).toBe("income");
    expect(fs.unlinkSync).toHaveBeenCalledWith("path/to/file.csv");
  });
});
