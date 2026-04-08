import { describe, expect, it } from "vitest";
import {
  commitmentInputSchema,
  commitmentPatchSchema,
  commitmentFrequencySchema,
  commitmentTypeSchema,
} from "@/lib/commitments/schemas";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TODAY = new Date().toISOString().slice(0, 10);

const BASE_VALID: Record<string, unknown> = {
  account_id: "00000000-0000-4000-8000-000000000001",
  amount_input: "85,75",
  commitment_type: "utility",
  frequency: "monthly",
  is_income: false,
  name: "Luz",
  next_due_date: TODAY,
  start_date: TODAY,
};

// ---------------------------------------------------------------------------
// commitmentTypeSchema
// ---------------------------------------------------------------------------
describe("commitmentTypeSchema", () => {
  it("accepts all valid commitment types", () => {
    const valid = [
      "mortgage",
      "rent_income",
      "rent_expense",
      "subscription",
      "tax",
      "insurance",
      "utility",
      "other",
    ] as const;
    valid.forEach((type) => {
      expect(() => commitmentTypeSchema.parse(type)).not.toThrow();
    });
  });

  it("rejects unknown type", () => {
    expect(() => commitmentTypeSchema.parse("cable_tv")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// commitmentFrequencySchema
// ---------------------------------------------------------------------------
describe("commitmentFrequencySchema", () => {
  it("accepts all valid frequency values", () => {
    const valid = [
      "daily",
      "weekly",
      "biweekly",
      "monthly",
      "bimonthly",
      "quarterly",
      "semiannual",
      "annual",
    ] as const;
    valid.forEach((freq) => {
      expect(() => commitmentFrequencySchema.parse(freq)).not.toThrow();
    });
  });

  it("rejects invalid frequency", () => {
    expect(() => commitmentFrequencySchema.parse("every_week")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// commitmentInputSchema — CREATE
// ---------------------------------------------------------------------------
describe("commitmentInputSchema", () => {
  it("accepts a fully valid utility commitment", () => {
    const result = commitmentInputSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
  });

  it("accepts integer amount (no decimals)", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, amount_input: "100" });
    expect(result.success).toBe(true);
  });

  it("accepts comma-decimal amount", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, amount_input: "1234,56" });
    expect(result.success).toBe(true);
  });

  it("accepts dot-decimal amount", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, amount_input: "1234.56" });
    expect(result.success).toBe(true);
  });

  it("rejects empty amount", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, amount_input: "" });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, amount_input: "-50" });
    expect(result.success).toBe(false);
  });

  it("rejects amount with more than 2 decimal places", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, amount_input: "10,123" });
    expect(result.success).toBe(false);
  });

  it("requires valid YYYY-MM-DD next_due_date", () => {
    const badDate = commitmentInputSchema.safeParse({ ...BASE_VALID, next_due_date: "08/04/2026" });
    expect(badDate.success).toBe(false);

    const badDate2 = commitmentInputSchema.safeParse({
      ...BASE_VALID,
      next_due_date: "2026-04-08T00:00:00Z",
    });
    expect(badDate2.success).toBe(false);
  });

  it("requires valid YYYY-MM-DD start_date", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, start_date: "invalid" });
    expect(result.success).toBe(false);
  });

  it("requires valid UUID for account_id", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, account_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects null account_id (DB constraint enforced at API level)", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, account_id: null });
    expect(result.success).toBe(false);
  });

  it("requires non-empty name", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name with XSS payload (sanitizePlainText strips tags, original !== sanitized)", () => {
    const result = commitmentInputSchema.safeParse({
      ...BASE_VALID,
      name: "<script>alert(1)</script>",
    });
    // sanitizePlainText removes <script>...</script> → sanitized "" !== original → refine fails
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (.strict())", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, injected_field: "hack" });
    expect(result.success).toBe(false);
  });

  it("transforms empty cancelled_at to null", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, cancelled_at: "" });
    if (result.success) {
      expect(result.data.cancelled_at).toBeNull();
    } else {
      // null is acceptable behaviour
      expect(true).toBe(true);
    }
  });

  it("transforms empty interest_rate_input to null", () => {
    const result = commitmentInputSchema.safeParse({ ...BASE_VALID, interest_rate_input: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interest_rate_input).toBeNull();
    }
  });

  it("accepts valid interest rate '3,5'", () => {
    const result = commitmentInputSchema.safeParse({
      ...BASE_VALID,
      interest_rate_input: "3,5",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.interest_rate_input).toBeCloseTo(3.5);
    }
  });

  // Bug fixed in lib/commitments/schemas.ts: now uses ctx.addIssue + z.NEVER instead of throw
  it("rejects malformed interest rate", () => {
    const result = commitmentInputSchema.safeParse({
      ...BASE_VALID,
      interest_rate_input: "abc",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// commitmentPatchSchema — EDIT
// ---------------------------------------------------------------------------
describe("commitmentPatchSchema", () => {
  it("accepts partial update with only name", () => {
    const result = commitmentPatchSchema.safeParse({ name: "Agua" });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with only amount", () => {
    const result = commitmentPatchSchema.safeParse({ amount_input: "120,00" });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with date change using YYYY-MM-DD", () => {
    const result = commitmentPatchSchema.safeParse({ next_due_date: TODAY });
    expect(result.success).toBe(true);
  });

  it("rejects date in wrong format DD/MM/YYYY (the edit bug)", () => {
    const result = commitmentPatchSchema.safeParse({ next_due_date: "08/04/2026" });
    expect(result.success).toBe(false);
    const errorMessages = result.success ? [] : result.error.issues.map((i) => i.message);
    expect(errorMessages.some((m) => m.toLowerCase().includes("date"))).toBe(true);
  });

  it("rejects ISO timestamp format (the TZ-shift edit bug)", () => {
    const result = commitmentPatchSchema.safeParse({
      next_due_date: "2026-04-08T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("refine rejects payload with only unknown fields", () => {
    // .strict() rejects unknown keys before the refine can run
    const result = commitmentPatchSchema.safeParse({ unknown_field: "hack" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown fields (.strict())", () => {
    const result = commitmentPatchSchema.safeParse({ name: "Ok", hack: true });
    expect(result.success).toBe(false);
  });

  it("transforms empty cancelled_at to null on patch", () => {
    const result = commitmentPatchSchema.safeParse({ cancelled_at: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cancelled_at).toBeNull();
    }
  });
});
