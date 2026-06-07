import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIService } from "./ai.service";
import { prisma } from "../../shared/prisma";

vi.mock("../../shared/prisma", () => ({
  prisma: {
    category: {
      findMany: vi.fn(),
    },
  },
}));

describe("AIService", () => {
  const userId = "user-123";
  const mockCategories = [
    { id: 1, name: "An uong", nameVi: "Ăn uống", isSystem: true },
    { id: 2, name: "Di chuyen", nameVi: "Di chuyển", isSystem: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.category.findMany).mockResolvedValue(mockCategories as any);
  });

  it("should suggest category based on keywords (with accents)", async () => {
    const result = await AIService.suggestCategory(userId, "Ăn sáng phở bò");
    expect(result[0].categoryId).toBe(1);
    expect(result[0].confidence).toBe(0.9);
  });

  it("should suggest category based on keywords (without accents)", async () => {
    const result = await AIService.suggestCategory(userId, "di grab di lam");
    expect(result[0].categoryId).toBe(2);
    expect(result[0].confidence).toBe(0.9);
  });

  it("should return null if no match found", async () => {
    const result = await AIService.suggestCategory(userId, "something unknown");
    expect(result[0].categoryId).toBeNull();
    expect(result[0].confidence).toBe(0);
  });
});
