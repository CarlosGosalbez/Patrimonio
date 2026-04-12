import { describe, expect, it } from "vitest";
import {
  buildExchangeRateMap,
  buildPositionLedger,
  calculateAnnualDividendIncomeCents,
  calculateUnrealizedPlPercent,
  calculateOperationTotalCents,
  convertCents,
  estimateDividendPaymentCents,
  parseQuantityInput,
} from "@/lib/investments/calculations";
import type { LedgerOperationInput } from "@/lib/investments/calculations";
import {
  investmentOperationCreateSchema,
  investmentPositionInputSchema,
} from "@/lib/investments/schemas";

describe("investmentPositionInputSchema — account_id optional", () => {
  const validBase = {
    currency: "EUR",
    investment_type: "stock",
    name: "ACME Corp",
    opening_date: "2026-04-07",
    opening_price_input: "100,00",
    opening_quantity_input: "10",
    ticker: "ACME",
  } as const;

  it("accepts a valid UUID as account_id", () => {
    const result = investmentPositionInputSchema.safeParse({
      ...validBase,
      account_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.account_id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("accepts null account_id (no linked account)", () => {
    const result = investmentPositionInputSchema.safeParse({ ...validBase, account_id: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.account_id).toBeNull();
  });

  it("accepts missing account_id (defaults to null)", () => {
    const result = investmentPositionInputSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.account_id).toBeNull();
  });

  it("rejects an invalid (non-UUID) account_id string", () => {
    const result = investmentPositionInputSchema.safeParse({
      ...validBase,
      account_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("phase 6 investment calculations", () => {
  it("parses fractional units with comma decimals", () => {
    expect(parseQuantityInput("12,345678")).toBeCloseTo(12.345678);
  });

  it("throws on empty quantity input", () => {
    expect(() => parseQuantityInput("")).toThrow("Invalid number format");
  });

  it("throws when quantity has too many decimal digits (>8)", () => {
    expect(() => parseQuantityInput("1.123456789")).toThrow("Invalid number format");
  });

  it("throws when quantity is zero or negative", () => {
    expect(() => parseQuantityInput("0")).toThrow();
  });

  it("returns feeCents directly for fee operation type", () => {
    expect(
      calculateOperationTotalCents({
        feeCents: 500,
        operationType: "fee",
        priceCents: 0,
        quantity: 0,
      }),
    ).toBe(500);
  });

  it("builds correct totals for buy, sell, dividend and split operations", () => {
    expect(
      calculateOperationTotalCents({
        feeCents: 250,
        operationType: "buy",
        priceCents: 1_250,
        quantity: 10,
      }),
    ).toBe(12_750);

    expect(
      calculateOperationTotalCents({
        feeCents: 250,
        operationType: "sell",
        priceCents: 1_500,
        quantity: 10,
      }),
    ).toBe(14_750);

    expect(
      calculateOperationTotalCents({
        feeCents: 0,
        operationType: "dividend",
        priceCents: 45,
        quantity: 100,
      }),
    ).toBe(4_500);

    expect(
      calculateOperationTotalCents({
        feeCents: 0,
        operationType: "split",
        priceCents: 0,
        quantity: 5,
      }),
    ).toBe(0);
  });

  it("estimates the next dividend amount from annual dividend and frequency", () => {
    expect(
      estimateDividendPaymentCents({
        annualDividendPerShareCents: 320,
        frequency: "quarterly",
        quantity: 25,
      }),
    ).toBe(2_000);
  });

  it("computes unrealized percent against invested capital", () => {
    expect(calculateUnrealizedPlPercent(125_000, 100_000)).toBe(25);
  });

  it("returns null when invested capital is zero (numeric form)", () => {
    expect(calculateUnrealizedPlPercent(100_000, 0)).toBeNull();
  });

  it("accepts object form and returns percent when invested > 0", () => {
    expect(
      calculateUnrealizedPlPercent({ currentValueCents: 125_000, totalInvestedCents: 100_000 }),
    ).toBe(25);
  });

  it("returns null from object form when invested is zero", () => {
    expect(
      calculateUnrealizedPlPercent({ currentValueCents: 100_000, totalInvestedCents: 0 }),
    ).toBeNull();
  });

  it("resolves fx rates using direct or inverse pairs", () => {
    const fxMap = buildExchangeRateMap([
      { base_currency: "USD", quote_currency: "EUR", rate_value: 0.92 },
      { base_currency: "EUR", quote_currency: "USD", rate_value: 1.08695652 },
    ]);

    expect(
      convertCents({
        amountCents: 100_000,
        fromCurrency: "USD",
        rates: fxMap,
        toCurrency: "EUR",
      }),
    ).toBe(92_000);

    expect(
      convertCents({
        amountCents: 92_000,
        fromCurrency: "EUR",
        rates: fxMap,
        toCurrency: "USD",
      }),
    ).toBe(100_000);
  });

  it("returns amountCents unchanged when currency pair is the same", () => {
    const rates = buildExchangeRateMap([]);
    expect(
      convertCents({ amountCents: 10_000, fromCurrency: "EUR", toCurrency: "EUR", rates }),
    ).toBe(10_000);
  });

  it("returns amountCents unchanged when no rate is available", () => {
    const emptyRates = buildExchangeRateMap([]);
    expect(
      convertCents({
        amountCents: 10_000,
        fromCurrency: "CHF",
        toCurrency: "EUR",
        rates: emptyRates,
      }),
    ).toBe(10_000);
  });

  it("uses inverse rate when no direct rate exists", () => {
    const ratesOnlyInverse = buildExchangeRateMap([
      { base_currency: "USD", quote_currency: "EUR", rate_value: 0.92 },
      // No direct EUR:USD rate
    ]);
    // EUR → USD: no direct, inverse USD:EUR = 0.92 → Math.round(92_000 / 0.92) = 100_000
    expect(
      convertCents({
        amountCents: 92_000,
        fromCurrency: "EUR",
        toCurrency: "USD",
        rates: ratesOnlyInverse,
      }),
    ).toBe(100_000);
  });

  it("requires a price for buy operations and forbids it for splits", () => {
    expect(
      investmentOperationCreateSchema.safeParse({
        fee_input: "",
        notes: null,
        operation_date: "2026-04-06",
        operation_type: "buy",
        price_input: null,
        quantity_input: "10",
        withholding_input: "",
      }).success,
    ).toBe(false);

    expect(
      investmentOperationCreateSchema.safeParse({
        fee_input: "",
        notes: null,
        operation_date: "2026-04-06",
        operation_type: "split",
        price_input: "1,00",
        quantity_input: "5",
        withholding_input: "",
      }).success,
    ).toBe(false);
  });
});

describe("buildPositionLedger", () => {
  function makeOp(
    overrides: Partial<LedgerOperationInput> & Pick<LedgerOperationInput, "operation_type">,
  ): LedgerOperationInput {
    return {
      id: "op-default",
      operation_date: "2026-01-01",
      created_at: "2026-01-01T00:00:00Z",
      quantity: 1,
      total_cents: 10_000,
      ...overrides,
    };
  }

  it("buy increases quantity, total invested and avg purchase price", () => {
    const result = buildPositionLedger([
      makeOp({ id: "b1", operation_type: "buy", quantity: 10, total_cents: 100_000 }),
    ]);
    expect(result.quantity).toBe(10);
    expect(result.total_invested_cents).toBe(100_000);
    expect(result.avg_purchase_price_cents).toBe(10_000);
    expect(result.realized_pl_cents).toBe(0);
    expect(result.sales).toHaveLength(0);
  });

  it("sell reduces quantity and computes realized P&L via WACC", () => {
    const result = buildPositionLedger([
      makeOp({
        id: "b1",
        operation_date: "2026-01-01",
        operation_type: "buy",
        quantity: 10,
        total_cents: 100_000,
      }),
      makeOp({
        id: "s1",
        operation_date: "2026-01-02",
        operation_type: "sell",
        quantity: 5,
        total_cents: 60_000,
      }),
    ]);
    expect(result.quantity).toBe(5);
    // cost basis: 10_000 avg * 5 = 50_000; realized: 60_000 - 50_000 = 10_000
    expect(result.realized_pl_cents).toBe(10_000);
    expect(result.sales).toHaveLength(1);
    expect(result.sales[0].realized_pl_cents).toBe(10_000);
    expect(result.sales[0].cost_basis_cents).toBe(50_000);
  });

  it("split multiplies quantity without changing invested capital", () => {
    const result = buildPositionLedger([
      makeOp({
        id: "b1",
        operation_date: "2026-01-01",
        operation_type: "buy",
        quantity: 10,
        total_cents: 100_000,
      }),
      makeOp({
        id: "sp1",
        operation_date: "2026-01-02",
        operation_type: "split",
        quantity: 4,
        total_cents: 0,
      }),
    ]);
    expect(result.quantity).toBe(40); // 10 * 4
    expect(result.total_invested_cents).toBe(100_000); // unchanged
    expect(result.avg_purchase_price_cents).toBe(2_500); // 100_000 / 40
  });

  it("dividend accumulates income without affecting quantity or invested capital", () => {
    const result = buildPositionLedger([
      makeOp({
        id: "b1",
        operation_date: "2026-01-01",
        operation_type: "buy",
        quantity: 10,
        total_cents: 100_000,
      }),
      makeOp({
        id: "d1",
        operation_date: "2026-02-01",
        operation_type: "dividend",
        quantity: 10,
        total_cents: 2_000,
      }),
    ]);
    expect(result.quantity).toBe(10);
    expect(result.total_invested_cents).toBe(100_000);
    expect(result.dividend_income_cents).toBe(2_000);
    expect(result.realized_pl_cents).toBe(0);
  });

  it("buy-sell-buy-sell sequence gives correct cumulative realized P&L", () => {
    // b1: buy 10 @ 10_000 = 100_000 invested, avg=10_000
    // s1: sell 5 @ 14_000 each = 70_000, cost_basis=50_000, realized=+20_000, remaining 5 shares invested=50_000
    // b2: buy 5 @ 12_000 each = 60_000, total 10 shares invested=110_000, avg=11_000
    // s2: sell 10 @ 15_000 each = 150_000, cost_basis=110_000, realized=+40_000
    const result = buildPositionLedger([
      makeOp({
        id: "b1",
        operation_date: "2026-01-01",
        operation_type: "buy",
        quantity: 10,
        total_cents: 100_000,
      }),
      makeOp({
        id: "s1",
        operation_date: "2026-02-01",
        operation_type: "sell",
        quantity: 5,
        total_cents: 70_000,
      }),
      makeOp({
        id: "b2",
        operation_date: "2026-03-01",
        operation_type: "buy",
        quantity: 5,
        total_cents: 60_000,
      }),
      makeOp({
        id: "s2",
        operation_date: "2026-04-01",
        operation_type: "sell",
        quantity: 10,
        total_cents: 150_000,
      }),
    ]);
    expect(result.quantity).toBe(0);
    expect(result.realized_pl_cents).toBe(60_000); // 20_000 + 40_000
    expect(result.sales).toHaveLength(2);
    expect(result.total_invested_cents).toBe(0);
    expect(result.avg_purchase_price_cents).toBe(0);
  });

  it("sell on empty position (quantity=0) does not affect ledger", () => {
    const result = buildPositionLedger([
      makeOp({ id: "s1", operation_type: "sell", quantity: 5, total_cents: 50_000 }),
    ]);
    expect(result.quantity).toBe(0);
    expect(result.realized_pl_cents).toBe(0);
    expect(result.sales).toHaveLength(0);
  });

  it("split on empty position does not change quantity", () => {
    const result = buildPositionLedger([
      makeOp({ id: "sp1", operation_type: "split", quantity: 2, total_cents: 0 }),
    ]);
    expect(result.quantity).toBe(0);
  });
});

describe("calculateAnnualDividendIncomeCents", () => {
  it("returns 0 when quantity is zero", () => {
    expect(calculateAnnualDividendIncomeCents(0, 320)).toBe(0);
  });

  it("returns 0 when annual dividend per share is zero", () => {
    expect(calculateAnnualDividendIncomeCents(10, 0)).toBe(0);
  });

  it("returns the correct annual income for positive inputs", () => {
    expect(calculateAnnualDividendIncomeCents(100, 320)).toBe(32_000);
  });
});
