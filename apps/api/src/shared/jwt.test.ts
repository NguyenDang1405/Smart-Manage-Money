import { describe, it, expect } from "vitest";
import { JWTUtils } from "./jwt";

describe("JWTUtils", () => {
  it("should generate a valid token", () => {
    const payload = { userId: "123", email: "test@example.com" };
    const token = JWTUtils.generateToken(payload);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);
  });

  it("should verify a valid token and return the payload in the result object", () => {
    const payload = { userId: "123", email: "test@example.com" };
    const token = JWTUtils.generateToken(payload);
    
    const result = JWTUtils.verifyToken(token);
    expect(result.valid).toBe(true);
    expect(result.expired).toBe(false);
    expect(result.payload).toBeDefined();
    expect(result.payload?.userId).toBe(payload.userId);
    expect(result.payload?.email).toBe(payload.email);
  });

  it("should return valid:false and expired:false for an invalid token", () => {
    const invalidToken = "this.is.not.a.valid.token";
    const result = JWTUtils.verifyToken(invalidToken);
    
    expect(result.valid).toBe(false);
    expect(result.expired).toBe(false);
    expect(result.payload).toBeNull();
  });
});
