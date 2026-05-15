import { describe, it, expect, vi, beforeEach } from "vitest";
import { BudgetService } from "./budgets.service";
import { BudgetRepository } from "./budgets.repository";
import { prisma } from "../../shared/prisma";
import { AppError } from "../../shared/app-error";

vi.mock("./budgets.repository", () => ({
  BudgetRepository: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("../../shared/prisma", () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
    },
  },
}));

describe("BudgetService - getBudgets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retrieve budgets with default current month and year", async () => {
    const mockBudgets = [
      { id: "b1", categoryId: 1, amount: 2000000, month: 5, year: 2026 },
    ] as any;

    vi.mocked(BudgetRepository.findMany).mockResolvedValue(mockBudgets);

    const result = await BudgetService.getBudgets("user-uuid", {});

    const currentDate = new Date();
    const expectedMonth = currentDate.getMonth() + 1;
    const expectedYear = currentDate.getFullYear();

    expect(BudgetRepository.findMany).toHaveBeenCalledWith({
      userId: "user-uuid",
      month: expectedMonth,
      year: expectedYear,
    });

    expect(result).toEqual({
      month: expectedMonth,
      year: expectedYear,
      budgets: mockBudgets,
    });
  });

  it("should retrieve budgets with provided month and year", async () => {
    const mockBudgets = [
      { id: "b2", categoryId: 2, amount: 5000000, month: 12, year: 2025 },
    ] as any;

    vi.mocked(BudgetRepository.findMany).mockResolvedValue(mockBudgets);

    const result = await BudgetService.getBudgets("user-uuid", { month: 12, year: 2025 });

    expect(BudgetRepository.findMany).toHaveBeenCalledWith({
      userId: "user-uuid",
      month: 12,
      year: 2025,
    });

    expect(result).toEqual({
      month: 12,
      year: 2025,
      budgets: mockBudgets,
    });
  });
});

describe("BudgetService - upsertBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw NOT_FOUND error when category does not exist", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    await expect(
      BudgetService.upsertBudget("user-uuid", {
        categoryId: 999,
        amount: 3000000,
        month: 5,
        year: 2026,
      })
    ).rejects.toThrow(new AppError({ message: "Category not found", status: 404, code: "NOT_FOUND" }));

    expect(prisma.category.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
    });
  });

  it("should throw FORBIDDEN error when custom category belongs to another user", async () => {
    const mockedCategory = { id: 10, isSystem: false, userId: "another-user" };
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockedCategory as any);

    await expect(
      BudgetService.upsertBudget("user-uuid", {
        categoryId: 10,
        amount: 3000000,
        month: 5,
        year: 2026,
      })
    ).rejects.toThrow(/You are not authorized to set budget for this category/);
  });

  it("should successfully upsert budget for a valid system category", async () => {
    const mockedCategory = { id: 1, isSystem: true, userId: null };
    const mockedBudget = { id: "b-123", categoryId: 1, amount: 3000000, month: 5, year: 2026 } as any;

    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockedCategory as any);
    vi.mocked(BudgetRepository.upsert).mockResolvedValue(mockedBudget);

    const result = await BudgetService.upsertBudget("user-uuid", {
      categoryId: 1,
      amount: 3000000,
      month: 5,
      year: 2026,
    });

    expect(BudgetRepository.upsert).toHaveBeenCalledWith("user-uuid", {
      categoryId: 1,
      amount: 3000000,
      month: 5,
      year: 2026,
    });

    expect(result).toEqual(mockedBudget);
  });
});

describe("BudgetService - getBudgetSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should calculate correctly total budget and category spent progress", async () => {
    const mockBudgets = [
      { id: "b1", categoryId: 1, amount: 2000000, month: 5, year: 2026, category: { id: 1, name: "Thực phẩm & Ăn uống" } },
      { id: "b2", categoryId: 2, amount: 3000000, month: 5, year: 2026, category: { id: 2, name: "Giải trí & Mua sắm" } },
    ] as any;

    const mockExpenses = [
      { id: "t1", categoryId: 1, amount: 500000, type: "expense" },
      { id: "t2", categoryId: 1, amount: 300000, type: "expense" },
      { id: "t3", categoryId: 2, amount: 1500000, type: "expense" },
    ] as any;

    vi.mocked(BudgetRepository.findMany).mockResolvedValue(mockBudgets);
    vi.mocked(prisma.transaction.findMany).mockResolvedValue(mockExpenses);

    const result = await BudgetService.getBudgetSummary("user-uuid", { month: 5, year: 2026 });

    expect(result.totalBudget).toBe(5000000);
    expect(result.totalSpent).toBe(2300000);
    expect(result.remaining).toBe(2700000);
    expect(result.categories).toHaveLength(2);

    expect(result.categories[0]).toEqual({
      categoryId: 1,
      categoryName: "Thực phẩm & Ăn uống",
      budgetAmount: 2000000,
      spentAmount: 800000,
      percentage: 40,
      threshold: "NONE",
    });

    expect(result.categories[1]).toEqual({
      categoryId: 2,
      categoryName: "Giải trí & Mua sắm",
      budgetAmount: 3000000,
      spentAmount: 1500000,
      percentage: 50,
      threshold: "NONE",
    });
  });

  it("should assign correct alert thresholds (WARNING >= 80, DANGER >= 100)", async () => {
    const mockBudgets = [
      { id: "b1", categoryId: 1, amount: 1000000, month: 5, year: 2026, category: { id: 1, name: "C1" } }, // 85% - WARNING
      { id: "b2", categoryId: 2, amount: 2000000, month: 5, year: 2026, category: { id: 2, name: "C2" } }, // 100% - DANGER
      { id: "b3", categoryId: 3, amount: 3000000, month: 5, year: 2026, category: { id: 3, name: "C3" } }, // 110% - DANGER
    ] as any;

    const mockExpenses = [
      { id: "t1", categoryId: 1, amount: 850000, type: "expense" },
      { id: "t2", categoryId: 2, amount: 2000000, type: "expense" },
      { id: "t3", categoryId: 3, amount: 3300000, type: "expense" },
    ] as any;

    vi.mocked(BudgetRepository.findMany).mockResolvedValue(mockBudgets);
    vi.mocked(prisma.transaction.findMany).mockResolvedValue(mockExpenses);

    const result = await BudgetService.getBudgetSummary("user-uuid", { month: 5, year: 2026 });

    expect(result.categories).toHaveLength(3);
    
    // 85% -> WARNING
    expect(result.categories[0].percentage).toBe(85);
    expect(result.categories[0].threshold).toBe("WARNING");

    // 100% -> DANGER
    expect(result.categories[1].percentage).toBe(100);
    expect(result.categories[1].threshold).toBe("DANGER");

    // 110% -> DANGER
    expect(result.categories[2].percentage).toBe(110);
    expect(result.categories[2].threshold).toBe("DANGER");
  });
});

describe("BudgetService - suggestBudgetsWithAI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  it("should return average spending suggestions as fallback if GEMINI_API_KEY is not defined", async () => {
    const mockExpenses = [
      { id: "e1", categoryId: 1, amount: 600000, type: "expense", transactionDate: new Date(), category: { id: 1, name: "C1" } },
      { id: "e2", categoryId: 1, amount: 900000, type: "expense", transactionDate: new Date(), category: { id: 1, name: "C1" } },
    ] as any;

    vi.mocked(prisma.transaction.findMany).mockResolvedValue(mockExpenses);

    const result = await BudgetService.suggestBudgetsWithAI("user-uuid");

    expect(result.isMock).toBe(true);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].categoryName).toBe("C1");
    // Average spent over unique months (1 month in this mock date setup) = 1,500,000 / 1 = 1,500,000
    expect(result.suggestions[0].suggestedAmount).toBe(1500000);
  });
});
