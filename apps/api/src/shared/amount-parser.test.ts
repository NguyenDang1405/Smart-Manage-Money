import { describe, it, expect } from "vitest";
import { parseVietnameseAmount } from "./amount-parser";

describe("parseVietnameseAmount", () => {
  it("should handle pure numbers", () => {
    expect(parseVietnameseAmount(50000)).toBe(50000);
    expect(parseVietnameseAmount("50000")).toBe(50000);
  });

  it("should parse 'k' (thousands)", () => {
    expect(parseVietnameseAmount("50k")).toBe(50000);
    expect(parseVietnameseAmount("1.5k")).toBe(1500);
    expect(parseVietnameseAmount("1k5")).toBe(1500);
  });

  it("should parse 'tr' or 'm' (millions)", () => {
    expect(parseVietnameseAmount("2tr")).toBe(2000000);
    expect(parseVietnameseAmount("1.5tr")).toBe(1500000);
    expect(parseVietnameseAmount("2tr5")).toBe(2500000);
    expect(parseVietnameseAmount("10m")).toBe(10000000);
  });

  it("should parse 'b' (billions)", () => {
    expect(parseVietnameseAmount("1b")).toBe(1000000000);
    expect(parseVietnameseAmount("1.2b")).toBe(1200000000);
  });

  it("should handle mixed case and spaces", () => {
    expect(parseVietnameseAmount(" 50 K ")).toBe(50000);
    expect(parseVietnameseAmount("2 TR 5")).toBe(2500000);
  });

  it("should return 0 for invalid input", () => {
    expect(parseVietnameseAmount("abc")).toBe(0);
    expect(parseVietnameseAmount("")).toBe(0);
  });
});
