/**
 * Tests adicionales para cerrar gaps de cobertura en:
 * - lib/analytics/calculations.ts (buildMonthlyTrendCards, buildBudget503020Summary)
 * - lib/budgets/utils.ts (getBudgetWindow, getBudgetHistoryWindows, isBudgetWindowVisible)
 * - lib/imports/correlation.ts (detectRecurringGroups)
 * - lib/investments/calculations.ts (isQuoteStale, estimateDividendPaymentCents, resolveFxRate)
 */

import { describe, it, expect, vi } from "vitest";
import { buildMonthlyTrendCards, buildBudget503020Summary } from "@/lib/analytics/calculations";
import {
  getBudgetWindow,
  getBudgetHistoryWindows,
  isBudgetWindowVisible,
} from "@/lib/budgets/utils";
import type { BudgetRow } from "@/lib/budgets/types";
import { detectRecurringGroups } from "@/lib/imports/correlation";
import {
  isQuoteStale,
  estimateDividendPaymentCents,
  resolveFxRate,
  buildFxRateMap,
  convertCentsWithFx,
} from "@/lib/investments/calculations";

// ─── buildMonthlyTrendCards ──────────────────────────────────────────────────

describe("buildMonthlyTrendCards", () => {
  it("returns trend cards sorted by absolute delta descending", () => {
    const input = [
      {
        category_id: "cat-1",
        category_name: "Restaurantes",
        category_color: "#f59e0b",
        monthly_totals: [5000, 5000, 5000],
        current_month_cents: 10000, // +100% delta
      },
      {
        category_id: "cat-2",
        category_name: "Supermercado",
        category_color: "#22c55e",
        monthly_totals: [10000, 10000, 10000],
        current_month_cents: 10500, // +5% delta — smaller
      },
    ];

    const result = buildMonthlyTrendCards(input);
    expect(result).toHaveLength(2);
    // cat-1 has larger delta → should be first
    expect(result[0].category_id).toBe("cat-1");
    expect(result[1].category_id).toBe("cat-2");
  });

  it("filters out categories with < 3 months of history", () => {
    const input = [
      {
        category_id: "cat-short",
        category_name: "New",
        category_color: null,
        monthly_totals: [5000, 5000], // only 2 months
        current_month_cents: 6000,
      },
    ];
    const result = buildMonthlyTrendCards(input);
    expect(result).toHaveLength(0);
  });

  it("sets delta_percent to null when average is 0", () => {
    const input = [
      {
        category_id: "cat-zero",
        category_name: "Zero history",
        category_color: null,
        monthly_totals: [0, 0, 0],
        current_month_cents: 1000,
      },
    ];
    const result = buildMonthlyTrendCards(input);
    expect(result).toHaveLength(1);
    expect(result[0].delta_percent).toBeNull();
  });

  it("returns at most 4 cards when more than 4 categories given", () => {
    const input = Array.from({ length: 8 }, (_, i) => ({
      category_id: `cat-${i}`,
      category_name: `Category ${i}`,
      category_color: null,
      monthly_totals: [5000, 5000, 5000],
      current_month_cents: 5000 + i * 100,
    }));
    const result = buildMonthlyTrendCards(input);
    expect(result.length).toBeLessThanOrEqual(4);
  });
});

// ─── buildBudget503020Summary ────────────────────────────────────────────────

describe("buildBudget503020Summary", () => {
  // classify503020Category: hipoteca/supermercado → needs; restaurantes/suscripciones → wants
  const expenses = [
    { amount_cents: 80000, category_name: "Hipoteca" },
    { amount_cents: 30000, category_name: "Supermercado" },
    { amount_cents: 20000, category_name: "Restaurantes" },
    { amount_cents: 15000, category_name: "Suscripciones" }, // ← must match /suscripciones/ regex
  ];

  it("classifies needs and wants correctly", () => {
    const result = buildBudget503020Summary({ expenses, incomeCents: 300000 });
    expect(result.needs.actual_cents).toBe(110000); // 80000 + 30000
    expect(result.wants.actual_cents).toBe(35000); // 20000 + 15000
    expect(result.income_cents).toBe(300000);
  });

  it("calculates savings as income minus total expenses", () => {
    const result = buildBudget503020Summary({ expenses, incomeCents: 300000 });
    expect(result.savings.actual_cents).toBe(155000); // 300000 - 145000
  });

  it("returns null percent_of_income when income is 0", () => {
    const result = buildBudget503020Summary({ expenses, incomeCents: 0 });
    expect(result.needs.percent_of_income).toBeNull();
    expect(result.wants.percent_of_income).toBeNull();
  });

  it("status is 'over' when needs exceed 50% of income", () => {
    const result = buildBudget503020Summary({ expenses, incomeCents: 100000 });
    // needs = 110000, income = 100000 → over
    expect(result.needs.status).toBe("over");
  });

  it("handles empty expenses list", () => {
    const result = buildBudget503020Summary({ expenses: [], incomeCents: 200000 });
    expect(result.needs.actual_cents).toBe(0);
    expect(result.wants.actual_cents).toBe(0);
    expect(result.savings.actual_cents).toBe(200000);
  });
});

// ─── getBudgetWindow ─────────────────────────────────────────────────────────

describe("getBudgetWindow", () => {
  // noon UTC to avoid DST/timezone boundary issues in UTC+1/+2 environments
  const ref = new Date("2026-04-15T12:00:00Z");

  it("monthly: returns correct start/end for current month", () => {
    const w = getBudgetWindow("monthly", ref, 0);
    expect(w.period_start).toBe("2026-04-01");
    expect(w.period_end).toBe("2026-04-30");
  });

  it("monthly: offset +1 returns next month", () => {
    const w = getBudgetWindow("monthly", ref, 1);
    expect(w.period_start).toBe("2026-05-01");
    expect(w.period_end).toBe("2026-05-31");
  });

  it("monthly: offset -1 returns previous month", () => {
    const w = getBudgetWindow("monthly", ref, -1);
    expect(w.period_start).toBe("2026-03-01");
    expect(w.period_end).toBe("2026-03-31");
  });

  it("annual: returns correct year window", () => {
    const w = getBudgetWindow("annual", ref, 0);
    expect(w.period_start).toBe("2026-01-01");
    expect(w.period_end).toBe("2026-12-31");
    expect(w.label).toBe("2026");
  });

  it("annual: offset +1 returns next year", () => {
    const w = getBudgetWindow("annual", ref, 1);
    expect(w.period_start).toBe("2027-01-01");
  });

  it("annual: offset -1 returns previous year", () => {
    const w = getBudgetWindow("annual", ref, -1);
    expect(w.period_start).toBe("2025-01-01");
  });
});

describe("getBudgetHistoryWindows", () => {
  // noon UTC to avoid timezone boundary issues
  const ref = new Date("2026-04-15T12:00:00Z");

  it("monthly: returns 6 windows in ascending order", () => {
    const budget = { period: "monthly" } as unknown as BudgetRow;
    const windows = getBudgetHistoryWindows(budget, ref);
    expect(windows).toHaveLength(6);
    // Should be in ascending order
    expect(windows[0].period_start < windows[5].period_start).toBe(true);
  });

  it("annual: returns 4 windows", () => {
    const budget = { period: "annual" } as unknown as BudgetRow;
    const windows = getBudgetHistoryWindows(budget, ref);
    expect(windows).toHaveLength(4);
  });
});

describe("isBudgetWindowVisible", () => {
  it("returns true when window overlaps with budget period", () => {
    expect(
      isBudgetWindowVisible(
        { start_date: "2026-01-01", end_date: null },
        { period_start: "2026-04-01", period_end: "2026-04-30" },
      ),
    ).toBe(true);
  });

  it("returns false when window is before budget start", () => {
    expect(
      isBudgetWindowVisible(
        { start_date: "2026-04-01", end_date: null },
        { period_start: "2026-01-01", period_end: "2026-01-31" },
      ),
    ).toBe(false);
  });

  it("returns false when window is after budget end", () => {
    expect(
      isBudgetWindowVisible(
        { start_date: "2026-01-01", end_date: "2026-03-31" },
        { period_start: "2026-04-01", period_end: "2026-04-30" },
      ),
    ).toBe(false);
  });

  it("returns true when budget has no end_date", () => {
    expect(
      isBudgetWindowVisible(
        { start_date: "2025-01-01", end_date: null },
        { period_start: "2026-12-01", period_end: "2026-12-31" },
      ),
    ).toBe(true);
  });
});

// ─── detectRecurringGroups ───────────────────────────────────────────────────

describe("detectRecurringGroups", () => {
  it("detects recurring transactions by amount + description similarity", () => {
    const rows = [
      { amount_cents: -29900, description: "Netflix subscription" },
      { amount_cents: -29900, description: "Netflix subscription" },
      { amount_cents: -29900, description: "Netflix subscription" },
      { amount_cents: -8500, description: "Spotify" },
    ];
    const groups = detectRecurringGroups(rows);
    expect(groups.length).toBeGreaterThanOrEqual(1);
    const netlixGroup = groups.find((g) => g.description.toLowerCase().includes("netflix"));
    expect(netlixGroup?.count).toBeGreaterThanOrEqual(2);
  });

  it("does not flag single-occurrence transactions", () => {
    const rows = [
      { amount_cents: -15000, description: "Repair car" },
      { amount_cents: -25000, description: "Holiday hotel" },
    ];
    const groups = detectRecurringGroups(rows);
    expect(groups).toHaveLength(0);
  });

  it("handles empty input", () => {
    expect(detectRecurringGroups([])).toHaveLength(0);
  });
});

// ─── isQuoteStale ─────────────────────────────────────────────────────────────

describe("isQuoteStale", () => {
  it("returns true when updatedAt is null", () => {
    expect(isQuoteStale(null)).toBe(true);
  });

  it("returns true when data is older than threshold", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T10:00:00Z"));
    const old = new Date("2026-04-12T09:15:00Z").toISOString(); // 45 min ago
    expect(isQuoteStale(old, 30)).toBe(true);
    vi.useRealTimers();
  });

  it("returns false when data is fresh", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T10:00:00Z"));
    const fresh = new Date("2026-04-12T09:45:00Z").toISOString(); // 15 min ago
    expect(isQuoteStale(fresh, 30)).toBe(false);
    vi.useRealTimers();
  });

  it("respects custom threshold (5 min)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T10:00:00Z"));
    const tenMinAgo = new Date("2026-04-12T09:50:00Z").toISOString();
    expect(isQuoteStale(tenMinAgo, 5)).toBe(true); // stale at 5 min threshold
    expect(isQuoteStale(tenMinAgo, 15)).toBe(false); // fresh at 15 min threshold
    vi.useRealTimers();
  });
});

// ─── estimateDividendPaymentCents ─────────────────────────────────────────────

describe("estimateDividendPaymentCents", () => {
  it("monthly: divides annual amount by 12", () => {
    // 100 shares × 12000 annual / 12 = 100000
    expect(
      estimateDividendPaymentCents({
        quantity: 100,
        annualDividendPerShareCents: 12000,
        frequency: "monthly",
      }),
    ).toBe(100000);
  });

  it("quarterly: divides annual amount by 4", () => {
    // 100 shares × 4000 annual / 4 = 100000
    expect(
      estimateDividendPaymentCents({
        quantity: 100,
        annualDividendPerShareCents: 4000,
        frequency: "quarterly",
      }),
    ).toBe(100000);
  });

  it("semiannual: divides annual amount by 2", () => {
    // 50 shares × 8000 annual / 2 = 200000
    expect(
      estimateDividendPaymentCents({
        quantity: 50,
        annualDividendPerShareCents: 8000,
        frequency: "semiannual",
      }),
    ).toBe(200000);
  });

  it("annual: returns full annual amount", () => {
    // 10 shares × 5000 annual / 1 = 50000
    expect(
      estimateDividendPaymentCents({
        quantity: 10,
        annualDividendPerShareCents: 5000,
        frequency: "annual",
      }),
    ).toBe(50000);
  });
});

// ─── resolveFxRate ────────────────────────────────────────────────────────────

describe("resolveFxRate", () => {
  it("returns 1 for same currency", () => {
    const fxMap = new Map<string, number>();
    expect(resolveFxRate({ fromCurrency: "EUR", fxMap, toCurrency: "EUR" })).toBe(1);
  });

  it("returns direct rate when available", () => {
    const fxMap = new Map([["EUR:USD", 1.1]]);
    expect(resolveFxRate({ fromCurrency: "EUR", fxMap, toCurrency: "USD" })).toBe(1.1);
  });

  it("returns inverse rate when only inverse key exists", () => {
    const fxMap = new Map([["USD:EUR", 2]]); // 1 USD = 2 EUR → 1 EUR = 0.5 USD
    expect(resolveFxRate({ fromCurrency: "EUR", fxMap, toCurrency: "USD" })).toBe(0.5);
  });

  it("returns 1 as fallback when no rate found", () => {
    const fxMap = new Map<string, number>();
    expect(resolveFxRate({ fromCurrency: "EUR", fxMap, toCurrency: "GBP" })).toBe(1);
  });
});

describe("convertCentsWithFx", () => {
  it("applies fx rate and rounds", () => {
    expect(convertCentsWithFx({ amountCents: 100000, fxRate: 1.1 })).toBe(110000);
  });

  it("rounds fractional results", () => {
    // Math.round(33333 * 1.5) = Math.round(49999.5) = 50000
    expect(convertCentsWithFx({ amountCents: 33333, fxRate: 1.5 })).toBe(50000);
  });
});

describe("buildFxRateMap", () => {
  it("builds map from rows with rate_value field", () => {
    const rows = [{ base_currency: "EUR", quote_currency: "USD", rate_value: 1.1 }];
    const map = buildFxRateMap(rows);
    expect(map.get("EUR:USD")).toBe(1.1);
  });

  it("builds map from rows with legacy rate field", () => {
    const rows = [{ base_currency: "EUR", quote_currency: "GBP", rate: 0.85 }];
    const map = buildFxRateMap(rows as Parameters<typeof buildFxRateMap>[0]);
    expect(map.get("EUR:GBP")).toBe(0.85);
  });
});
