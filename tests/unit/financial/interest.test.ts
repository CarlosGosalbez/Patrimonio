import { describe, it, expect } from "vitest";
import { calculateCompoundInterest } from "@/lib/financial/interest";

describe("calculateCompoundInterest", () => {
  it("calculates 5% annual interest compounded monthly for 1 year", () => {
    // P = 1000€ (100000 cents), r = 5%, n = 12, t = 1
    // Expected: A ≈ 1051.16 (105116 cents), I ≈ 51.16 (5116 cents)
    const result = calculateCompoundInterest(100000, 0.05, 12, "monthly");

    expect(result.finalBalanceCents).toBeGreaterThanOrEqual(105100);
    expect(result.finalBalanceCents).toBeLessThanOrEqual(105200);
    expect(result.interestEarnedCents).toBeGreaterThanOrEqual(5100);
    expect(result.interestEarnedCents).toBeLessThanOrEqual(5200);
  });

  it("calculates 3% annual interest compounded quarterly for 2 years", () => {
    // P = 5000€ (500000 cents), r = 3%, n = 4, t = 2
    // Expected: A ≈ 5308.39 (530839 cents), I ≈ 308.39 (30839 cents)
    const result = calculateCompoundInterest(500000, 0.03, 24, "quarterly");

    expect(result.finalBalanceCents).toBeGreaterThanOrEqual(530799);
    expect(result.finalBalanceCents).toBeLessThanOrEqual(530900);
    expect(result.interestEarnedCents).toBeGreaterThanOrEqual(30799);
    expect(result.interestEarnedCents).toBeLessThanOrEqual(30900);
  });

  it("returns zero interest when rate is 0", () => {
    const result = calculateCompoundInterest(100000, 0, 12, "monthly");

    expect(result.finalBalanceCents).toBe(100000);
    expect(result.interestEarnedCents).toBe(0);
  });

  it("generates monthly breakdown with correct length", () => {
    const result = calculateCompoundInterest(100000, 0.05, 12, "monthly");

    expect(result.monthlyBreakdown).toHaveLength(12);
    expect(result.monthlyBreakdown[0].month).toBe(1);
    expect(result.monthlyBreakdown[11].month).toBe(12);
  });

  it("throws error for negative principal", () => {
    expect(() => calculateCompoundInterest(-100, 0.05, 12, "monthly")).toThrow(
      "Principal must be positive",
    );
  });

  it("throws error for invalid rate", () => {
    expect(() => calculateCompoundInterest(100000, 1.5, 12, "monthly")).toThrow(
      "Annual rate must be between 0 and 1",
    );
  });

  it("handles annual capitalization correctly", () => {
    // P = 1000€ (100000 cents), r = 5%, n = 1, t = 1
    // Expected: A = 105000 (1050€ exactly for annual)
    const result = calculateCompoundInterest(100000, 0.05, 12, "annual");

    expect(result.finalBalanceCents).toBe(105000);
    expect(result.interestEarnedCents).toBe(5000);
  });

  it("validates monthly breakdown totals match final balance", () => {
    const result = calculateCompoundInterest(100000, 0.05, 12, "monthly");

    // Last month's endBalance should match finalBalance
    const lastMonth = result.monthlyBreakdown[result.monthlyBreakdown.length - 1];
    expect(lastMonth.endBalanceCents).toBe(result.finalBalanceCents);
  });
});
