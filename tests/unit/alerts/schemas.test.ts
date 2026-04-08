/**
 * tests/unit/alerts/schemas.test.ts
 *
 * Tests para customAlertInputSchema, customAlertPatchSchema, alertPreferencesSchema.
 * Cubre: todos los campos de alerta, recurrencias, inyección en name/description,
 * boundary values de advance_notice_days, transformaciones de fecha/importe vacíos.
 */
import { describe, expect, it } from "vitest";
import {
  alertPreferencesSchema,
  alertRecurrenceSchema,
  customAlertInputSchema,
  customAlertPatchSchema,
} from "@/lib/alerts/schemas";

const VALID_UUID = "00000000-0000-4000-8000-000000000001";
const TODAY = new Date().toISOString().slice(0, 10);

const BASE_VALID: Record<string, unknown> = {
  due_date: TODAY,
  name: "IBI Municipal",
  recurrence: "annual",
};

// ---------------------------------------------------------------------------
// alertRecurrenceSchema
// ---------------------------------------------------------------------------
describe("alertRecurrenceSchema", () => {
  it.each(["monthly", "quarterly", "semiannual", "annual", "biennial", "once"])(
    "accepts recurrence: %s",
    (rec) => {
      expect(alertRecurrenceSchema.safeParse(rec).success).toBe(true);
    },
  );

  it("rejects 'weekly' (not a valid recurrence for alerts)", () => {
    expect(alertRecurrenceSchema.safeParse("weekly").success).toBe(false);
  });

  it("rejects 'daily'", () => {
    expect(alertRecurrenceSchema.safeParse("daily").success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(alertRecurrenceSchema.safeParse("").success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// customAlertInputSchema — happy path
// ---------------------------------------------------------------------------
describe("customAlertInputSchema — valid inputs", () => {
  it("accepts minimal valid alert (name + due_date + recurrence)", () => {
    expect(customAlertInputSchema.safeParse(BASE_VALID).success).toBe(true);
  });

  it("defaults advance_notice_days to 30", () => {
    const result = customAlertInputSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.advance_notice_days).toBe(30);
  });

  it("defaults auto_deactivate to true", () => {
    const result = customAlertInputSchema.safeParse(BASE_VALID);
    if (result.success) expect(result.data.auto_deactivate).toBe(true);
  });

  it("defaults is_active to true", () => {
    const result = customAlertInputSchema.safeParse(BASE_VALID);
    if (result.success) expect(result.data.is_active).toBe(true);
  });

  it("defaults category_id to null", () => {
    const result = customAlertInputSchema.safeParse(BASE_VALID);
    if (result.success) expect(result.data.category_id).toBeNull();
  });

  it("defaults currency to EUR", () => {
    const result = customAlertInputSchema.safeParse(BASE_VALID);
    if (result.success) expect(result.data.currency).toBe("EUR");
  });

  it("accepts alert with expected_amount_input", () => {
    const result = customAlertInputSchema.safeParse({
      ...BASE_VALID,
      expected_amount_input: "1250,00",
    });
    expect(result.success).toBe(true);
  });

  it("transforms empty expected_amount_input to null", () => {
    const result = customAlertInputSchema.safeParse({
      ...BASE_VALID,
      expected_amount_input: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.expected_amount_input).toBeNull();
  });

  it("accepts valid dismissed_until date", () => {
    const result = customAlertInputSchema.safeParse({
      ...BASE_VALID,
      dismissed_until: "2026-06-01",
    });
    expect(result.success).toBe(true);
  });

  it("transforms empty dismissed_until to null", () => {
    const result = customAlertInputSchema.safeParse({
      ...BASE_VALID,
      dismissed_until: "",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dismissed_until).toBeNull();
  });

  it("accepts valid description", () => {
    const result = customAlertInputSchema.safeParse({
      ...BASE_VALID,
      description: "IBI municipal del año 2026",
    });
    expect(result.success).toBe(true);
  });

  it("accepts category_id as UUID", () => {
    const result = customAlertInputSchema.safeParse({
      ...BASE_VALID,
      category_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it("accepts category_id as null (no category)", () => {
    const result = customAlertInputSchema.safeParse({
      ...BASE_VALID,
      category_id: null,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// customAlertInputSchema — advance_notice_days boundaries
// ---------------------------------------------------------------------------
describe("customAlertInputSchema — advance_notice_days boundaries", () => {
  it("accepts 0 (same day alert)", () => {
    expect(
      customAlertInputSchema.safeParse({ ...BASE_VALID, advance_notice_days: 0 }).success,
    ).toBe(true);
  });

  it("accepts 365 (one year advance notice)", () => {
    expect(
      customAlertInputSchema.safeParse({ ...BASE_VALID, advance_notice_days: 365 }).success,
    ).toBe(true);
  });

  it("rejects negative advance_notice_days", () => {
    expect(
      customAlertInputSchema.safeParse({ ...BASE_VALID, advance_notice_days: -1 }).success,
    ).toBe(false);
  });

  it("rejects float advance_notice_days (must be integer)", () => {
    expect(
      customAlertInputSchema.safeParse({ ...BASE_VALID, advance_notice_days: 30.5 }).success,
    ).toBe(false);
  });

  it("coerces string '7' to number 7 via z.coerce.number()", () => {
    const result = customAlertInputSchema.safeParse({ ...BASE_VALID, advance_notice_days: "7" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.advance_notice_days).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// customAlertInputSchema — required fields
// ---------------------------------------------------------------------------
describe("customAlertInputSchema — required fields", () => {
  it("rejects missing name", () => {
    const { name: _, ...withoutName } = BASE_VALID;
    expect(customAlertInputSchema.safeParse(withoutName).success).toBe(false);
  });

  it("rejects empty name (min(1))", () => {
    expect(customAlertInputSchema.safeParse({ ...BASE_VALID, name: "" }).success).toBe(false);
  });

  it("rejects missing due_date", () => {
    const { due_date: _, ...withoutDate } = BASE_VALID;
    expect(customAlertInputSchema.safeParse(withoutDate).success).toBe(false);
  });

  it("rejects missing recurrence", () => {
    const { recurrence: _, ...withoutRecurrence } = BASE_VALID;
    expect(customAlertInputSchema.safeParse(withoutRecurrence).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// customAlertInputSchema — security
// ---------------------------------------------------------------------------
describe("customAlertInputSchema — security", () => {
  it("rejects XSS in name", () => {
    expect(
      customAlertInputSchema.safeParse({
        ...BASE_VALID,
        name: "<script>alert(document.cookie)</script>",
      }).success,
    ).toBe(false);
  });

  it("rejects XSS in description", () => {
    expect(
      customAlertInputSchema.safeParse({
        ...BASE_VALID,
        description: "legit <script>alert(1)</script> text",
      }).success,
    ).toBe(false);
  });

  it("rejects null byte in name", () => {
    expect(
      customAlertInputSchema.safeParse({ ...BASE_VALID, name: "IBI\x00injected" }).success,
    ).toBe(false);
  });

  it("rejects user_id injection (.strict())", () => {
    expect(
      customAlertInputSchema.safeParse({ ...BASE_VALID, user_id: "attacker-uid" }).success,
    ).toBe(false);
  });

  it("rejects id injection (.strict() — can't override PK)", () => {
    expect(customAlertInputSchema.safeParse({ ...BASE_VALID, id: "00000000-fake" }).success).toBe(
      false,
    );
  });

  it("rejects malformed category_id UUID", () => {
    expect(
      customAlertInputSchema.safeParse({ ...BASE_VALID, category_id: "not-uuid" }).success,
    ).toBe(false);
  });

  it("rejects ISO timestamp in due_date (prevents timezone shift bug)", () => {
    expect(
      customAlertInputSchema.safeParse({ ...BASE_VALID, due_date: "2026-04-08T00:00:00Z" }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// customAlertPatchSchema
// ---------------------------------------------------------------------------
describe("customAlertPatchSchema", () => {
  it("accepts single-field patch: name only", () => {
    expect(customAlertPatchSchema.safeParse({ name: "IRPF Trimestral" }).success).toBe(true);
  });

  it("accepts single-field patch: due_date only", () => {
    expect(customAlertPatchSchema.safeParse({ due_date: TODAY }).success).toBe(true);
  });

  it("accepts deactivation flag patch", () => {
    expect(customAlertPatchSchema.safeParse({ is_active: false }).success).toBe(true);
  });

  it("rejects empty patch (at least one field required)", () => {
    const result = customAlertPatchSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("At least one field is required");
    }
  });

  it("rejects unknown fields (.strict())", () => {
    expect(customAlertPatchSchema.safeParse({ name: "ok", hack: true }).success).toBe(false);
  });

  it("transforms empty expected_amount_input to null on patch", () => {
    const result = customAlertPatchSchema.safeParse({ expected_amount_input: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.expected_amount_input).toBeNull();
  });

  it("transforms empty dismissed_until to null on patch", () => {
    const result = customAlertPatchSchema.safeParse({ dismissed_until: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dismissed_until).toBeNull();
  });

  it("rejects user_id injection on patch", () => {
    expect(customAlertPatchSchema.safeParse({ name: "ok", user_id: "attacker" }).success).toBe(
      false,
    );
  });

  it("rejects id injection on patch", () => {
    expect(customAlertPatchSchema.safeParse({ name: "ok", id: "fake" }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// alertPreferencesSchema
// ---------------------------------------------------------------------------
describe("alertPreferencesSchema", () => {
  it("accepts enabled=true", () => {
    expect(alertPreferencesSchema.safeParse({ weekly_alert_digest_enabled: true }).success).toBe(
      true,
    );
  });

  it("accepts enabled=false", () => {
    expect(alertPreferencesSchema.safeParse({ weekly_alert_digest_enabled: false }).success).toBe(
      true,
    );
  });

  it("rejects string 'true' instead of boolean", () => {
    expect(alertPreferencesSchema.safeParse({ weekly_alert_digest_enabled: "true" }).success).toBe(
      false,
    );
  });

  it("rejects missing field", () => {
    expect(alertPreferencesSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown fields (.strict())", () => {
    expect(
      alertPreferencesSchema.safeParse({
        weekly_alert_digest_enabled: true,
        extra_field: "hack",
      }).success,
    ).toBe(false);
  });
});
