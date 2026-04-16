import { describe, it, expect } from "vitest";
import { HashUtils } from "./hash";

describe("HashUtils", () => {
  it("should hash a password successfully", async () => {
    const password = "password123";
    const hash = await HashUtils.hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20);
  });

  it("should return true when comparing a valid password with its hash", async () => {
    const password = "password123";
    const hash = await HashUtils.hashPassword(password);
    
    const result = await HashUtils.comparePassword(password, hash);
    expect(result).toBe(true);
  });

  it("should return false when comparing an invalid password with a hash", async () => {
    const password = "password123";
    const wrongPassword = "wrongpassword";
    const hash = await HashUtils.hashPassword(password);
    
    const result = await HashUtils.comparePassword(wrongPassword, hash);
    expect(result).toBe(false);
  });
});
