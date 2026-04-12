import { describe, it, expect } from "vitest";
import {
  centsToDec,
  decToCents,
  formatCents,
  formatChangeNarrative,
  formatCompact,
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatPercent,
  formatPercentChange,
  parseInputToCents,
} from "@/lib/financial/formatters";

describe("financial formatters", () => {
  describe("centsToDec", () => {
    it("converts cents to euros", () => {
      expect(centsToDec(85075)).toBe(850.75);
      expect(centsToDec(100)).toBe(1);
      expect(centsToDec(0)).toBe(0);
    });
  });

  describe("decToCents", () => {
    it("converts euros to cents without float errors", () => {
      expect(decToCents(850.75)).toBe(85075);
      expect(decToCents(1)).toBe(100);
      expect(decToCents(0.1)).toBe(10);
    });

    it("rounds correctly", () => {
      expect(decToCents(1.005)).toBe(100); // IEEE 754: 1.005 * 100 = 100.49999...
      expect(decToCents(1.115)).toBe(112); // Correct rounding
    });
  });

  describe("formatCurrency", () => {
    it("formats in es-ES locale", () => {
      const result = formatCurrency(85075, "EUR");
      expect(result).toContain("850");
      expect(result).toContain("75");
      expect(result).toContain("€");
    });

    it("handles zero", () => {
      const result = formatCurrency(0, "EUR");
      expect(result).toContain("0");
    });
  });

  describe("formatCurrencyCompact", () => {
    it("formats large amounts with compact notation", () => {
      const result = formatCurrencyCompact(1250000, "EUR");
      expect(result).toContain("mil");
      expect(result).toContain("€");
    });
  });

  describe("formatCents", () => {
    it("formats cents without currency symbol", () => {
      expect(formatCents(85075)).toContain("850");
    });
  });

  describe("formatPercent", () => {
    it("formats decimal as percentage", () => {
      const result = formatPercent(0.0575);
      expect(result).toContain("5");
      expect(result).toContain("%");
    });
  });

  describe("formatPercentChange", () => {
    it("adds the sign for positive percentages", () => {
      expect(formatPercentChange(12.5)).toContain("+");
    });
  });

  describe("parseInputToCents", () => {
    it("parses comma decimal separator", () => {
      expect(parseInputToCents("850,75")).toBe(85075);
    });

    it("parses dot decimal separator", () => {
      expect(parseInputToCents("850.75")).toBe(85075);
    });

    it("parses thousands separators safely", () => {
      expect(parseInputToCents("1.234,56")).toBe(123456);
    });

    it("throws on invalid input", () => {
      expect(() => parseInputToCents("abc")).toThrow("Invalid number format");
    });

    it("throws on empty string", () => {
      expect(() => parseInputToCents("")).toThrow("Invalid number format");
    });

    it("parses integer-only input without decimal separator", () => {
      expect(parseInputToCents("100")).toBe(10000);
    });

    it("throws when decimal part exceeds two digits", () => {
      expect(() => parseInputToCents("1.2345")).toThrow("Invalid number format");
    });
  });

  describe("formatDate", () => {
    it("long format returns a string containing the year", () => {
      const result = formatDate("2026-04-01", "long");
      expect(typeof result).toBe("string");
      expect(result).toContain("2026");
    });

    it("full format is longer than short format", () => {
      const shortResult = formatDate("2026-04-01", "short");
      const fullResult = formatDate("2026-04-01", "full");
      expect(fullResult.length).toBeGreaterThan(shortResult.length);
    });
  });

  describe("formatChangeNarrative", () => {
    it('returns "sin cambios" for zero', () => {
      expect(formatChangeNarrative(0)).toBe("sin cambios");
    });

    it("reports ha aumentado for positive values", () => {
      expect(formatChangeNarrative(5.5)).toMatch(/aumentado/);
    });

    it("reports ha disminuido for negative values", () => {
      expect(formatChangeNarrative(-3.2)).toMatch(/disminuido/);
    });
  });

  describe("formatCompact", () => {
    it("formats large numbers compactly", () => {
      const result = formatCompact(1_500_000);
      expect(typeof result).toBe("string");
      expect(result.length).toBeLessThan(15);
    });

    it("formats small numbers without omitting digits", () => {
      const result = formatCompact(500);
      expect(result).toContain("5");
    });
  });
});
