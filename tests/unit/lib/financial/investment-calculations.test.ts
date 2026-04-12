import { describe, it, expect } from "vitest";
import {
  buildPositionLedger,
  calculateOperationTotalCents,
  calculateUnrealizedPlPercent,
  buildExchangeRateMap,
  convertCents,
} from "@/lib/investments/calculations";
import type { LedgerOperationInput } from "@/lib/investments/calculations";

// ─── calculateOperationTotalCents ────────────────────────────────────────────

describe("calculateOperationTotalCents", () => {
  it("buy: grossAmount + fee", () => {
    expect(
      calculateOperationTotalCents({
        feeCents: 500,
        operationType: "buy",
        priceCents: 5000,
        quantity: 10,
      }),
    ).toBe(50500); // 10 * 5000 + 500
  });

  it("sell: grossAmount - fee (non-negative)", () => {
    expect(
      calculateOperationTotalCents({
        feeCents: 200,
        operationType: "sell",
        priceCents: 6000,
        quantity: 5,
      }),
    ).toBe(29800); // 5 * 6000 - 200
  });

  it("sell never goes below 0", () => {
    expect(
      calculateOperationTotalCents({
        feeCents: 999999,
        operationType: "sell",
        priceCents: 100,
        quantity: 1,
      }),
    ).toBe(0);
  });

  it("split returns 0 regardless of price/quantity", () => {
    expect(
      calculateOperationTotalCents({
        feeCents: 0,
        operationType: "split",
        priceCents: 5000,
        quantity: 2,
      }),
    ).toBe(0);
  });

  it("dividend: proceeds - fee (same as sell logic)", () => {
    expect(
      calculateOperationTotalCents({
        feeCents: 100,
        operationType: "dividend",
        priceCents: 50,
        quantity: 20,
      }),
    ).toBe(900); // 20 * 50 - 100
  });

  it("fee: returns only the fee amount", () => {
    expect(
      calculateOperationTotalCents({
        feeCents: 750,
        operationType: "fee",
        priceCents: 0,
        quantity: 0,
      }),
    ).toBe(750);
  });
});

// ─── buildPositionLedger — P&L and weighted average ─────────────────────────

describe("buildPositionLedger — P&L scenarios", () => {
  const buyOp = (
    id: string,
    quantity: number,
    totalCents: number,
    date = "2026-01-01",
  ): LedgerOperationInput => ({
    created_at: `${date}T10:00:00Z`,
    id,
    operation_date: date,
    operation_type: "buy",
    quantity,
    total_cents: totalCents,
  });

  const sellOp = (
    id: string,
    quantity: number,
    totalCents: number,
    date = "2026-03-01",
  ): LedgerOperationInput => ({
    created_at: `${date}T10:00:00Z`,
    id,
    operation_date: date,
    operation_type: "sell",
    quantity,
    total_cents: totalCents,
  });

  it("single buy: sets quantity and total_invested", () => {
    const result = buildPositionLedger([buyOp("b1", 10, 50000)]);
    expect(result.quantity).toBe(10);
    expect(result.total_invested_cents).toBe(50000);
    expect(result.avg_purchase_price_cents).toBe(5000); // 50000 / 10
    expect(result.realized_pl_cents).toBe(0);
  });

  it("buy + sell: calculates realized P&L correctly", () => {
    // Buy 10 @ €50 = €500; Sell 5 @ €55 = €275
    // Cost basis of 5 = 5 * 5000 = 25000
    // Proceeds = 27500
    // Realized P&L = 27500 - 25000 = 2500
    const result = buildPositionLedger([buyOp("b1", 10, 50000), sellOp("s1", 5, 27500)]);
    expect(result.realized_pl_cents).toBe(2500);
    expect(result.quantity).toBe(5);
  });

  it("weighted average price after two buys at different prices", () => {
    // Buy 100 @ €10 = €1000
    // Buy 50 @ €12 = €600
    // Total invested = €1600, quantity = 150
    // Avg = 1600/150 = 10.666... → 1067 cents (rounded)
    const result = buildPositionLedger([
      buyOp("b1", 100, 100000, "2026-01-01"),
      buyOp("b2", 50, 60000, "2026-02-01"),
    ]);
    expect(result.quantity).toBe(150);
    expect(result.total_invested_cents).toBe(160000);
    expect(result.avg_purchase_price_cents).toBe(1067); // Math.round(160000/150)
  });

  it("split doubles quantity without changing invested amount", () => {
    const splitOp: LedgerOperationInput = {
      created_at: "2026-02-01T10:00:00Z",
      id: "split-1",
      operation_date: "2026-02-01",
      operation_type: "split",
      quantity: 2,
      total_cents: 0,
    };
    const result = buildPositionLedger([buyOp("b1", 10, 50000), splitOp]);
    expect(result.quantity).toBe(20);
    expect(result.total_invested_cents).toBe(50000); // unchanged
  });

  it("dividend income is tracked separately from P&L", () => {
    const dividendOp: LedgerOperationInput = {
      created_at: "2026-03-15T10:00:00Z",
      id: "div-1",
      operation_date: "2026-03-15",
      operation_type: "dividend",
      quantity: 1,
      total_cents: 5000,
    };
    const result = buildPositionLedger([buyOp("b1", 10, 50000), dividendOp]);
    expect(result.dividend_income_cents).toBe(5000);
    expect(result.realized_pl_cents).toBe(0); // dividends not counted as realized P&L
  });

  it("empty operations returns zero state", () => {
    const result = buildPositionLedger([]);
    expect(result.quantity).toBe(0);
    expect(result.total_invested_cents).toBe(0);
    expect(result.avg_purchase_price_cents).toBe(0);
    expect(result.realized_pl_cents).toBe(0);
  });
});

// ─── calculateUnrealizedPlPercent ───────────────────────────────────────────

describe("calculateUnrealizedPlPercent", () => {
  it("calculates positive unrealized gain", () => {
    // Invested €500, current €600 → +20%
    const result = calculateUnrealizedPlPercent(60000, 50000);
    expect(result).toBeCloseTo(20, 1);
  });

  it("calculates negative unrealized loss", () => {
    // Invested €500, current €400 → -20%
    const result = calculateUnrealizedPlPercent(40000, 50000);
    expect(result).toBeCloseTo(-20, 1);
  });

  it("returns null when invested is 0", () => {
    const result = calculateUnrealizedPlPercent(0, 0);
    expect(result).toBeNull();
  });

  it("accepts object form", () => {
    const result = calculateUnrealizedPlPercent({
      currentValueCents: 60000,
      totalInvestedCents: 50000,
    });
    expect(result).toBeCloseTo(20, 1);
  });
});

// ─── Currency conversion ─────────────────────────────────────────────────────

describe("buildExchangeRateMap + convertCents", () => {
  it("builds map and converts EUR → USD", () => {
    const rates = buildExchangeRateMap([
      { base_currency: "EUR", quote_currency: "USD", rate_value: 1.1 },
    ]);
    const result = convertCents({
      amountCents: 100000,
      fromCurrency: "EUR",
      rates,
      toCurrency: "USD",
    });
    expect(result).toBe(110000); // 100000 * 1.1
  });

  it("same currency returns same amount", () => {
    const rates = buildExchangeRateMap([]);
    expect(
      convertCents({ amountCents: 50000, fromCurrency: "EUR", rates, toCurrency: "EUR" }),
    ).toBe(50000);
  });

  it("uses inverse rate when direct not available", () => {
    const rates = buildExchangeRateMap([
      { base_currency: "USD", quote_currency: "EUR", rate_value: 2 },
    ]);
    const result = convertCents({
      amountCents: 100000,
      fromCurrency: "EUR",
      rates,
      toCurrency: "USD",
    });
    // inverse: 1/2 = 0.5 → 100000 * 0.5 = 50000
    expect(result).toBe(50000);
  });
});
