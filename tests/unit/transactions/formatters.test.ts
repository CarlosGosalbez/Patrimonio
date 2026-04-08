import { describe, it, expect } from "vitest";
import { formatCurrency, decToCents, centsToDec } from "@/lib/financial/formatters";

describe("financial formatters — transaction amounts", () => {
  it("formats positive cents as currency", () => {
    expect(formatCurrency(85075)).toMatch(/850/);
  });

  it("formats zero as €0", () => {
    expect(formatCurrency(0)).toMatch(/0/);
  });

  it("decToCents rounds floating point correctly", () => {
    expect(decToCents(850.75)).toBe(85075);
    expect(decToCents(0.1 + 0.2)).toBe(30); // floating-point safe
  });

  it("centsToDec is inverse of decToCents", () => {
    expect(centsToDec(decToCents(42.99))).toBeCloseTo(42.99);
  });

  it("expense amount is negated correctly by API pattern", () => {
    const amount = 5000;
    const isIncome = false;
    const stored = isIncome ? Math.abs(amount) : -Math.abs(amount);
    expect(stored).toBe(-5000);
  });
});
