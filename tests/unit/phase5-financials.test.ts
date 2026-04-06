import { describe, expect, it } from "vitest";
import {
  buildAnalyticsRange,
  buildMonthlyTrendCards,
  buildSeriesBuckets,
  calculateSavingsRate,
  detectSpendingAnomalies,
} from "@/lib/analytics/calculations";
import {
  calculateBudgetProgress,
  calculateChangePercent,
  getBudgetStatus,
} from "@/lib/budgets/utils";

describe("phase 5 financial calculations", () => {
  describe("buildAnalyticsRange", () => {
    const REF = new Date("2026-04-06T12:00:00");

    it("week period starts on Monday and ends on Sunday", () => {
      const range = buildAnalyticsRange("week", REF);
      expect(range.start).toBe("2026-03-30");
      expect(range.end).toBe("2026-04-05");
    });

    it("month period covers the full current month", () => {
      const range = buildAnalyticsRange("month", REF);
      expect(range.start).toBe("2026-04-01");
      expect(range.end).toBe("2026-04-30");
    });

    it("quarter period covers Q2 (Apr–Jun)", () => {
      const range = buildAnalyticsRange("quarter", REF);
      expect(range.start).toBe("2026-04-01");
      expect(range.end).toBe("2026-06-30");
    });

    it("year period covers the full year", () => {
      const range = buildAnalyticsRange("year", REF);
      expect(range.start).toBe("2026-01-01");
      expect(range.end).toBe("2026-12-31");
    });
  });

  describe("buildSeriesBuckets", () => {
    it("week period produces 7 daily buckets", () => {
      const range = buildAnalyticsRange("week", new Date("2026-04-06"));
      const buckets = buildSeriesBuckets("week", range);
      expect(buckets).toHaveLength(7);
      expect(buckets[0]?.period_start).toBe(buckets[0]?.period_end);
    });

    it("month period produces 4-5 weekly buckets", () => {
      const range = buildAnalyticsRange("month", new Date("2026-04-06"));
      const buckets = buildSeriesBuckets("month", range);
      expect(buckets.length).toBeGreaterThanOrEqual(4);
      expect(buckets.length).toBeLessThanOrEqual(5);
    });

    it("quarter period produces 3 monthly buckets", () => {
      const range = buildAnalyticsRange("quarter", new Date("2026-04-06"));
      const buckets = buildSeriesBuckets("quarter", range);
      expect(buckets).toHaveLength(3);
    });

    it("year period produces 12 monthly buckets", () => {
      const range = buildAnalyticsRange("year", new Date("2026-04-06"));
      const buckets = buildSeriesBuckets("year", range);
      expect(buckets).toHaveLength(12);
    });

    it("all bucket amounts start at 0", () => {
      const range = buildAnalyticsRange("month", new Date("2026-04-06"));
      const buckets = buildSeriesBuckets("month", range);
      for (const bucket of buckets) {
        expect(bucket.income_cents).toBe(0);
        expect(bucket.expense_cents).toBe(0);
        expect(bucket.net_cents).toBe(0);
      }
    });
  });

  describe("calculateSavingsRate", () => {
    it("returns null when there is no income", () => {
      expect(calculateSavingsRate(0, 120_000)).toBeNull();
    });

    it("calculates the monthly savings rate as a percentage", () => {
      expect(calculateSavingsRate(400_000, 280_000)).toBe(30);
    });
  });

  describe("detectSpendingAnomalies", () => {
    it("flags a category when current month spending is above 2 standard deviations", () => {
      const anomalies = detectSpendingAnomalies([
        {
          category_color: "#ef4444",
          category_id: "restaurants",
          category_name: "Restaurantes",
          current_month_cents: 39_000,
          monthly_totals: [10_000, 11_000, 9_500, 10_200, 10_800, 10_100],
        },
      ]);

      expect(anomalies).toHaveLength(1);
      expect(anomalies[0]?.category_id).toBe("restaurants");
      expect(anomalies[0]?.severity).toBe("critical");
      expect(anomalies[0]?.z_score).toBeGreaterThan(2);
    });
  });

  describe("buildMonthlyTrendCards", () => {
    it("builds trend cards based on the previous three months average", () => {
      const cards = buildMonthlyTrendCards([
        {
          category_color: "#0f766e",
          category_id: "groceries",
          category_name: "Supermercado",
          current_month_cents: 18_000,
          monthly_totals: [10_000, 12_000, 11_000],
        },
      ]);

      expect(cards).toHaveLength(1);
      expect(cards[0]?.average_3m_cents).toBe(11_000);
      expect(cards[0]?.delta_percent).toBeGreaterThan(60);
    });
  });

  describe("budget helpers", () => {
    it("calculates available amount and progress ratio", () => {
      const result = calculateBudgetProgress(50_000, 32_500);

      expect(result.available_cents).toBe(17_500);
      expect(result.progress_percent).toBe(65);
      expect(result.progress_ratio).toBeCloseTo(0.65);
    });

    it("classifies budget status using the configurable threshold", () => {
      expect(getBudgetStatus(0.55, 80)).toBe("ok");
      expect(getBudgetStatus(0.72, 80)).toBe("approaching");
      expect(getBudgetStatus(0.86, 80)).toBe("warning");
      expect(getBudgetStatus(1.02, 80)).toBe("exceeded");
    });

    it("computes period-over-period percentage change", () => {
      expect(calculateChangePercent(18_000, 12_000)).toBe(50);
      expect(calculateChangePercent(18_000, 0)).toBeNull();
    });
  });
});
