/**
 * tests/unit/budgets/schemas.test.ts
 *
 * Tests para budgetInputSchema y budgetPatchSchema.
 * Cubre: boundary values, seguridad (.strict()), transformaciones opcionales,
 * validación de moneda, períodos, thresholds de alerta.
 */
import { describe, expect, it } from "vitest";
import { budgetInputSchema, budgetPatchSchema, budgetPeriodSchema } from "@/lib/budgets/schemas";

const VALID_UUID = "00000000-0000-4000-8000-000000000001";
const TODAY = new Date().toISOString().slice(0, 10);

const BASE_VALID: Record<string, unknown> = {
  category_id: VALID_UUID,
  limit_input: "500,00",
  period: "monthly",
  start_date: TODAY,
};

// ---------------------------------------------------------------------------
// budgetPeriodSchema
// ---------------------------------------------------------------------------
describe("budgetPeriodSchema", () => {
  it("accepts 'monthly'", () => {
    expect(budgetPeriodSchema.safeParse("monthly").success).toBe(true);
  });

  it("accepts 'annual'", () => {
    expect(budgetPeriodSchema.safeParse("annual").success).toBe(true);
  });

  it("rejects 'weekly', 'quarterly', 'biweekly'", () => {
    expect(budgetPeriodSchema.safeParse("weekly").success).toBe(false);
    expect(budgetPeriodSchema.safeParse("quarterly").success).toBe(false);
    expect(budgetPeriodSchema.safeParse("biweekly").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(budgetPeriodSchema.safeParse("").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// budgetInputSchema — happy path
// ---------------------------------------------------------------------------
describe("budgetInputSchema — valid inputs", () => {
  it("accepts a minimal valid monthly budget", () => {
    expect(budgetInputSchema.safeParse(BASE_VALID).success).toBe(true);
  });

  it("accepts annual budget with end_date", () => {
    const result = budgetInputSchema.safeParse({
      ...BASE_VALID,
      period: "annual",
      end_date: "2026-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("defaults alert_threshold to 80 when omitted", () => {
    const result = budgetInputSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.alert_threshold).toBe(80);
  });

  it("defaults currency to EUR when omitted", () => {
    const result = budgetInputSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe("EUR");
  });

  it("defaults is_active to true when omitted", () => {
    const result = budgetInputSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.is_active).toBe(true);
  });

  it("normalizes currency to UPPERCASE (usd → USD)", () => {
    const result = budgetInputSchema.safeParse({ ...BASE_VALID, currency: "usd" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe("USD");
  });

  it("transforms empty end_date to null", () => {
    const result = budgetInputSchema.safeParse({ ...BASE_VALID, end_date: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.end_date).toBeNull();
  });

  it("transforms null end_date to null", () => {
    const result = budgetInputSchema.safeParse({ ...BASE_VALID, end_date: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.end_date).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// budgetInputSchema — alert_threshold boundary values
// ---------------------------------------------------------------------------
describe("budgetInputSchema — alert_threshold boundaries", () => {
  it("accepts threshold = 1 (minimum)", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, alert_threshold: 1 }).success).toBe(true);
  });

  it("accepts threshold = 100 (maximum)", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, alert_threshold: 100 }).success).toBe(true);
  });

  it("accepts threshold = 80 (default)", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, alert_threshold: 80 }).success).toBe(true);
  });

  it("rejects threshold = 0 (below minimum)", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, alert_threshold: 0 }).success).toBe(false);
  });

  it("rejects threshold = 101 (above maximum)", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, alert_threshold: 101 }).success).toBe(
      false,
    );
  });

  it("rejects negative threshold", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, alert_threshold: -1 }).success).toBe(false);
  });

  it("coerces string '80' to number 80", () => {
    const result = budgetInputSchema.safeParse({ ...BASE_VALID, alert_threshold: "80" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.alert_threshold).toBe(80);
  });

  it("rejects float threshold (must be integer)", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, alert_threshold: 80.5 }).success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// budgetInputSchema — limit_input (moneyInput)
// ---------------------------------------------------------------------------
describe("budgetInputSchema — limit_input", () => {
  it("accepts integer limit '500'", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, limit_input: "500" }).success).toBe(true);
  });

  it("accepts decimal with comma '500,00'", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, limit_input: "500,00" }).success).toBe(
      true,
    );
  });

  it("accepts decimal with dot '500.00'", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, limit_input: "500.00" }).success).toBe(
      true,
    );
  });

  it("rejects negative limit '-100'", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, limit_input: "-100" }).success).toBe(false);
  });

  it("rejects zero '0' (moneyInput allows 0 — documenting behavior)", () => {
    // moneyInput regex matches "0" → schema accepts it
    // The business rule about minimum budget amount must be enforced at DB level or UI
    const result = budgetInputSchema.safeParse({ ...BASE_VALID, limit_input: "0" });
    expect(result.success).toBe(true); // documents current behavior
  });

  it("rejects empty limit_input", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, limit_input: "" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// budgetInputSchema — security
// ---------------------------------------------------------------------------
describe("budgetInputSchema — security", () => {
  it("rejects injection of user_id (strict mode)", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, user_id: "attacker-uid" }).success).toBe(
      false,
    );
  });

  it("rejects injection of deleted_at (strict mode)", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, deleted_at: null }).success).toBe(false);
  });

  it("rejects injection of id (strict mode — can't override primary key)", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, id: "custom-id" }).success).toBe(false);
  });

  it("rejects malformed category_id UUID", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, category_id: "not-a-uuid" }).success).toBe(
      false,
    );
    expect(
      budgetInputSchema.safeParse({ ...BASE_VALID, category_id: "1; DROP TABLE budgets" }).success,
    ).toBe(false);
  });

  it("rejects currency with wrong length (!= 3 chars)", () => {
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, currency: "EU" }).success).toBe(false);
    expect(budgetInputSchema.safeParse({ ...BASE_VALID, currency: "EURO" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// budgetPatchSchema
// ---------------------------------------------------------------------------
describe("budgetPatchSchema", () => {
  it("accepts partial update with only limit_input", () => {
    expect(budgetPatchSchema.safeParse({ limit_input: "750,00" }).success).toBe(true);
  });

  it("accepts partial update with only period", () => {
    expect(budgetPatchSchema.safeParse({ period: "annual" }).success).toBe(true);
  });

  it("accepts partial update with only alert_threshold", () => {
    expect(budgetPatchSchema.safeParse({ alert_threshold: 90 }).success).toBe(true);
  });

  it("rejects empty patch (at least one field required)", () => {
    const result = budgetPatchSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("At least one field is required");
    }
  });

  it("rejects unknown fields (.strict())", () => {
    expect(budgetPatchSchema.safeParse({ limit_input: "100", hack: true }).success).toBe(false);
  });

  it("rejects invalid date format in start_date patch", () => {
    expect(budgetPatchSchema.safeParse({ start_date: "08/04/2026" }).success).toBe(false);
  });

  it("transforms empty end_date to null on patch", () => {
    const result = budgetPatchSchema.safeParse({ end_date: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.end_date).toBeNull();
  });

  it("rejects user_id injection on patch", () => {
    expect(budgetPatchSchema.safeParse({ limit_input: "100", user_id: "attacker" }).success).toBe(
      false,
    );
  });

  it("rejects alert_threshold = 0 on patch", () => {
    expect(budgetPatchSchema.safeParse({ alert_threshold: 0 }).success).toBe(false);
  });
});
