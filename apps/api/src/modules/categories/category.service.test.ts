import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryService } from "./category.service";
import { CategoryRepository } from "./category.repository";

vi.mock("./category.repository", () => ({
  CategoryRepository: {
    createCategory: vi.fn(),
    getCategories: vi.fn(),
  },
}));

describe("CategoryService", () => {
  const userId = "user-uuid-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCategory", () => {
    it("should create a category successfully", async () => {
      const input = { name: "Eating", icon: "🍱", color: "#FF5733" };
      const mockedCategory = { id: 1, ...input, userId, isSystem: false };

      vi.mocked(CategoryRepository.createCategory).mockResolvedValue(mockedCategory as any);

      const result = await CategoryService.createCategory(userId, input);

      expect(CategoryRepository.createCategory).toHaveBeenCalledWith(userId, input);
      expect(result).toEqual(mockedCategory);
    });
  });

  describe("getCategories", () => {
    it("should return a list of categories", async () => {
      const mockedCategories = [
        { id: 1, name: "System Cat", isSystem: true, userId: null },
        { id: 2, name: "User Cat", isSystem: false, userId: userId },
      ];

      vi.mocked(CategoryRepository.getCategories).mockResolvedValue(mockedCategories as any);

      const result = await CategoryService.getCategories(userId);

      expect(CategoryRepository.getCategories).toHaveBeenCalledWith(userId);
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockedCategories);
    });
  });
});
