import { describe, it, expect, vi, beforeEach } from "vitest";
import { UsersService } from "./users.service";
import { prisma } from "../../shared/prisma";
import { AppError } from "../../shared/app-error";

vi.mock("../../shared/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("UsersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateProfile", () => {
    it("should update user profile successfully", async () => {
      const mockUser = { id: "123", email: "test@test.com" };
      const updatedUser = { ...mockUser, fullName: "New Name", monthlyIncome: 5000000 };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.user.update as any).mockResolvedValue(updatedUser);

      const result = await UsersService.updateProfile("123", { fullName: "New Name", monthlyIncome: 5000000 });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "123" },
        data: { fullName: "New Name", monthlyIncome: 5000000 },
        select: expect.any(Object),
      });
      expect(result).toEqual(updatedUser);
    });

    it("should throw NOT_FOUND if user does not exist", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(UsersService.updateProfile("123", {})).rejects.toThrow(AppError);
    });
  });
});
