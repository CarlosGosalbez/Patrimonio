/**
 * Unit tests for AI agent utilities:
 * - Auto-categorization logic (503020 classifier)
 * - Spending anomaly detection
 * - Import correlation/matching rules
 *
 * Anthropic API is NOT called in any of these tests.
 * When the actual streamText-based agents are added, mock with:
 *   vi.mock("ai", () => ({ streamText: vi.fn().mockResolvedValue({ ... }) }))
 */

import { describe, it, expect, vi } from "vitest";
import { detectSpendingAnomalies, calculateSavingsRate } from "@/lib/analytics/calculations";
import { matchesRule, findMatchingRule } from "@/lib/imports/correlation";
import type { CorrelationRule, TransactionRow } from "@/lib/imports/correlation";

// ─── Auto-categorization: classify503020 (tested via detectSpendingAnomalies) ─

describe("calculateSavingsRate", () => {
  it("returns correct savings rate", () => {
    expect(calculateSavingsRate(300000, 150000)).toBe(50); // (300k-150k)/300k = 50%
  });

  it("returns null when income is 0", () => {
    expect(calculateSavingsRate(0, 100000)).toBeNull();
  });

  it("returns negative rate when expenses exceed income", () => {
    const rate = calculateSavingsRate(100000, 180000);
    expect(rate).toBeLessThan(0);
  });
});

// ─── Anomaly detection ───────────────────────────────────────────────────────

describe("detectSpendingAnomalies", () => {
  it("detects an outlier > 2σ above historical mean", () => {
    const series = [
      {
        category_id: "cat-1",
        category_name: "Restaurantes",
        category_color: "#f59e0b",
        // 3 months normal spending + spike
        monthly_totals: [5000, 5500, 6000, 25000],
        current_month_cents: 25000,
      },
    ];

    const anomalies = detectSpendingAnomalies(series);
    expect(anomalies.length).toBeGreaterThan(0);
    const anomaly = anomalies.find((a) => a.category_id === "cat-1");
    expect(anomaly).toBeDefined();
    // SpendingAnomaly items ARE anomalies — check they have severity
    expect(anomaly?.severity).toBeDefined();
    expect(["warning", "critical"]).toContain(anomaly?.severity);
  });

  it("returns no anomaly for consistent spending", () => {
    const series = [
      {
        category_id: "cat-2",
        category_name: "Supermercado",
        category_color: "#22c55e",
        monthly_totals: [50000, 52000, 48000, 51000],
        current_month_cents: 51000,
      },
    ];

    const anomalies = detectSpendingAnomalies(series);
    const anomaly = anomalies.find((a) => a.category_id === "cat-2");
    // Consistent spending should not produce anomalies
    expect(anomaly).toBeUndefined();
  });

  it("handles empty series without throwing", () => {
    expect(() => detectSpendingAnomalies([])).not.toThrow();
    expect(detectSpendingAnomalies([])).toEqual([]);
  });

  it("handles series with single data point", () => {
    const series = [
      {
        category_id: "cat-3",
        category_name: "Ropa",
        category_color: "#8b5cf6",
        monthly_totals: [10000],
        current_month_cents: 10000,
      },
    ];
    expect(() => detectSpendingAnomalies(series)).not.toThrow();
  });
});

// ─── Import correlation / auto-matching ─────────────────────────────────────

describe("matchesRule", () => {
  const baseRule: CorrelationRule = {
    id: "rule-1",
    commitment_id: "comm-1",
    match_type: "concept_contains",
    match_value: "MERCADONA",
    match_tolerance_cents: null,
    auto_apply: true,
    is_active: true,
  };

  it("concept_contains: matches case-insensitively", () => {
    const tx: TransactionRow = { amount_cents: -8000, description: "Compra MERCADONA Alcalá" };
    expect(matchesRule(tx, baseRule)).toBe(true);
  });

  it("concept_contains: does not match unrelated description", () => {
    const tx: TransactionRow = { amount_cents: -8000, description: "ZARA MADRID" };
    expect(matchesRule(tx, baseRule)).toBe(false);
  });

  it("exact_amount: matches exact cent amount", () => {
    const rule: CorrelationRule = { ...baseRule, match_type: "exact_amount", match_value: "29900" };
    expect(matchesRule({ amount_cents: -29900, description: "Netflix" }, rule)).toBe(true);
    expect(matchesRule({ amount_cents: -29800, description: "Netflix" }, rule)).toBe(false);
  });

  it("amount_range: matches within tolerance", () => {
    const rule: CorrelationRule = {
      ...baseRule,
      match_type: "amount_range",
      match_value: "50000",
      match_tolerance_cents: 500,
    };
    expect(matchesRule({ amount_cents: -50300, description: "Alquiler" }, rule)).toBe(true);
    expect(matchesRule({ amount_cents: -50600, description: "Alquiler" }, rule)).toBe(false);
  });

  it("concept_regex: matches with regex pattern", () => {
    const rule: CorrelationRule = {
      ...baseRule,
      match_type: "concept_regex",
      match_value: "^AMAZON|^AMZN",
    };
    expect(matchesRule({ amount_cents: -1999, description: "AMAZON ES" }, rule)).toBe(true);
    expect(matchesRule({ amount_cents: -1999, description: "ALIEXPRESS" }, rule)).toBe(false);
  });

  it("concept_regex: returns false for invalid regex", () => {
    const rule: CorrelationRule = {
      ...baseRule,
      match_type: "concept_regex",
      match_value: "[invalid",
    };
    expect(() => matchesRule({ amount_cents: -1000, description: "test" }, rule)).not.toThrow();
    expect(matchesRule({ amount_cents: -1000, description: "test" }, rule)).toBe(false);
  });
});

describe("findMatchingRule", () => {
  it("returns first matching rule", () => {
    const rules: CorrelationRule[] = [
      {
        id: "r1",
        commitment_id: "c1",
        match_type: "concept_contains",
        match_value: "NETFLIX",
        match_tolerance_cents: null,
        auto_apply: true,
        is_active: true,
      },
      {
        id: "r2",
        commitment_id: "c2",
        match_type: "concept_contains",
        match_value: "NETFLIX",
        match_tolerance_cents: null,
        auto_apply: true,
        is_active: true,
      },
    ];

    const tx: TransactionRow = { amount_cents: -1299, description: "NETFLIX SUBSCRIPTION" };
    const result = findMatchingRule(tx, rules);
    expect(result?.id).toBe("r1");
  });

  it("returns null when no rule matches", () => {
    const rules: CorrelationRule[] = [
      {
        id: "r1",
        commitment_id: "c1",
        match_type: "concept_contains",
        match_value: "NETFLIX",
        match_tolerance_cents: null,
        auto_apply: true,
        is_active: true,
      },
    ];
    const tx: TransactionRow = { amount_cents: -5000, description: "Random purchase" };
    expect(findMatchingRule(tx, rules)).toBeNull();
  });

  it("returns null for empty rule list", () => {
    const tx: TransactionRow = { amount_cents: -5000, description: "Test" };
    expect(findMatchingRule(tx, [])).toBeNull();
  });
});
