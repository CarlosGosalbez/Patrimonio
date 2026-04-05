import { describe, it, expect } from "vitest";
import {
  centsToDec,
  decToCents,
  formatCurrency,
  formatPercent,
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

  describe("formatPercent", () => {
    it("formats decimal as percentage", () => {
      const result = formatPercent(0.0575);
      expect(result).toContain("5");
      expect(result).toContain("%");
    });
  });

  describe("parseInputToCents", () => {
    it("parses comma decimal separator", () => {
      expect(parseInputToCents("850,75")).toBe(85075);
    });

    it("parses dot decimal separator", () => {
      expect(parseInputToCents("850.75")).toBe(85075);
    });

    it("throws on invalid input", () => {
      expect(() => parseInputToCents("abc")).toThrow("Invalid number format");
    });
  });
});

