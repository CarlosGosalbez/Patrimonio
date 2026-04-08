/**
 * tests/unit/investments/schemas.test.ts
 *
 * Tests negativos y de seguridad para los schemas de inversiones.
 * Cubre:
 *   - investmentPositionInputSchema: campos requeridos, boundaries, injection
 *   - investmentPositionPatchSchema: .refine "at least one field"
 *   - investmentOperationInputSchema: superRefine de reglas de negocio
 *     · split: price/fee/withholding PROHIBIDOS
 *     · buy/sell/dividend: price REQUERIDO
 *     · withholding solo en dividend
 *   - investmentSearchSchema: q inyección, limit boundaries
 *   - Todos los campos de texto: XSS, null byte, SQL injection
 */
import { describe, expect, it } from "vitest";
import {
  investmentExportSchema,
  investmentOperationInputSchema,
  investmentPositionInputSchema,
  investmentPositionPatchSchema,
  investmentSearchSchema,
} from "@/lib/investments/schemas";

const VALID_UUID = "00000000-0000-4000-8000-000000000001";
const TODAY = new Date().toISOString().slice(0, 10);

// ─── Base valido ──────────────────────────────────────────────────────────────

const BASE_POSITION: Record<string, unknown> = {
  investment_type: "stock",
  name: "Iberdrola",
  opening_date: TODAY,
  opening_price_input: "10,50",
  opening_quantity_input: "100",
  ticker: "IBE",
};

const BASE_OPERATION = {
  operation_date: TODAY,
  operation_type: "buy",
  price_input: "10,50",
  quantity_input: "100",
} satisfies Record<string, unknown>;

// ─── investmentPositionInputSchema ────────────────────────────────────────────

describe("investmentPositionInputSchema — campos requeridos", () => {
  it("acepta posición válida mínima", () => {
    expect(investmentPositionInputSchema.safeParse(BASE_POSITION).success).toBe(true);
  });

  it("rechaza sin investment_type", () => {
    const { investment_type: _, ...rest } = BASE_POSITION;
    expect(investmentPositionInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rechaza investment_type inválido", () => {
    expect(
      investmentPositionInputSchema.safeParse({ ...BASE_POSITION, investment_type: "nft" }).success,
    ).toBe(false);
  });

  it("rechaza sin name", () => {
    const { name: _, ...rest } = BASE_POSITION;
    expect(investmentPositionInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rechaza sin opening_price_input", () => {
    const { opening_price_input: _, ...rest } = BASE_POSITION;
    expect(investmentPositionInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rechaza sin opening_quantity_input", () => {
    const { opening_quantity_input: _, ...rest } = BASE_POSITION;
    expect(investmentPositionInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rechaza sin opening_date", () => {
    const { opening_date: _, ...rest } = BASE_POSITION;
    expect(investmentPositionInputSchema.safeParse(rest).success).toBe(false);
  });

  it("rechaza ticker vacío", () => {
    expect(investmentPositionInputSchema.safeParse({ ...BASE_POSITION, ticker: "" }).success).toBe(
      false,
    );
  });
});

describe("investmentPositionInputSchema — tipos de activo válidos", () => {
  const types = ["stock", "etf", "fund", "crypto", "deposit", "bond", "reit", "other"];
  it.each(types)("acepta investment_type: %s", (type) => {
    expect(
      investmentPositionInputSchema.safeParse({ ...BASE_POSITION, investment_type: type }).success,
    ).toBe(true);
  });
});

describe("investmentPositionInputSchema — inyección de seguridad", () => {
  it("rechaza XSS en name", () => {
    expect(
      investmentPositionInputSchema.safeParse({
        ...BASE_POSITION,
        name: '<script>alert("xss")</script>',
      }).success,
    ).toBe(false);
  });

  it("rechaza null byte en ticker", () => {
    expect(
      investmentPositionInputSchema.safeParse({ ...BASE_POSITION, ticker: "IB\x00E" }).success,
    ).toBe(false);
  });

  it("rechaza XSS en notes", () => {
    expect(
      investmentPositionInputSchema.safeParse({
        ...BASE_POSITION,
        notes: "<img src=x onerror=alert(1)>",
      }).success,
    ).toBe(false);
  });

  it("rechaza inyección SQL en notes (null byte)", () => {
    expect(
      investmentPositionInputSchema.safeParse({
        ...BASE_POSITION,
        notes: "'; DROP TABLE investment_positions; --\x00",
      }).success,
    ).toBe(false);
  });

  it("rechaza XSS en market", () => {
    expect(
      investmentPositionInputSchema.safeParse({
        ...BASE_POSITION,
        market: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });

  it("rechaza campo user_id inyectado (.strict())", () => {
    expect(
      investmentPositionInputSchema.safeParse({ ...BASE_POSITION, user_id: VALID_UUID }).success,
    ).toBe(false);
  });

  it("rechaza campo deleted_at inyectado (.strict())", () => {
    expect(
      investmentPositionInputSchema.safeParse({ ...BASE_POSITION, deleted_at: TODAY }).success,
    ).toBe(false);
  });

  it("rechaza campo id inyectado (.strict() — no se puede falsificar PK)", () => {
    expect(
      investmentPositionInputSchema.safeParse({ ...BASE_POSITION, id: VALID_UUID }).success,
    ).toBe(false);
  });
});

describe("investmentPositionInputSchema — threshold boundaries", () => {
  it("acepta threshold = 0.1 (mínimo)", () => {
    expect(
      investmentPositionInputSchema.safeParse({
        ...BASE_POSITION,
        daily_price_alert_threshold_percent: 0.1,
      }).success,
    ).toBe(true);
  });

  it("acepta threshold = 50 (máximo)", () => {
    expect(
      investmentPositionInputSchema.safeParse({
        ...BASE_POSITION,
        daily_price_alert_threshold_percent: 50,
      }).success,
    ).toBe(true);
  });

  it("rechaza threshold = 0 (por debajo del mínimo)", () => {
    expect(
      investmentPositionInputSchema.safeParse({
        ...BASE_POSITION,
        daily_price_alert_threshold_percent: 0,
      }).success,
    ).toBe(false);
  });

  it("rechaza threshold = 50.1 (sobre el máximo)", () => {
    expect(
      investmentPositionInputSchema.safeParse({
        ...BASE_POSITION,
        daily_price_alert_threshold_percent: 50.1,
      }).success,
    ).toBe(false);
  });

  it("rechaza threshold negativo", () => {
    expect(
      investmentPositionInputSchema.safeParse({
        ...BASE_POSITION,
        daily_price_alert_threshold_percent: -5,
      }).success,
    ).toBe(false);
  });

  it("acepta threshold como string con coma (normalizado)", () => {
    const result = investmentPositionInputSchema.safeParse({
      ...BASE_POSITION,
      daily_price_alert_threshold_percent: "5,5",
    });
    // string válido, se transforma a 5.5
    expect(result.success).toBe(true);
  });

  it("rechaza threshold no numérico 'abc'", () => {
    expect(
      investmentPositionInputSchema.safeParse({
        ...BASE_POSITION,
        daily_price_alert_threshold_percent: "abc",
      }).success,
    ).toBe(false);
  });
});

// ─── investmentPositionPatchSchema ───────────────────────────────────────────

describe("investmentPositionPatchSchema — at least one field", () => {
  it("acepta patch con un solo campo (ticker)", () => {
    expect(investmentPositionPatchSchema.safeParse({ ticker: "SAN" }).success).toBe(true);
  });

  it("normaliza ticker a mayúsculas", () => {
    const result = investmentPositionPatchSchema.safeParse({ ticker: "san" });
    if (result.success) expect(result.data.ticker).toBe("SAN");
  });

  it("rechaza XSS en name en patch", () => {
    expect(
      investmentPositionPatchSchema.safeParse({ name: "<script>alert(1)</script>" }).success,
    ).toBe(false);
  });

  it("rechaza user_id en patch (.strict())", () => {
    expect(
      investmentPositionPatchSchema.safeParse({ name: "Santander", user_id: VALID_UUID }).success,
    ).toBe(false);
  });
});

// ─── investmentOperationInputSchema — reglas de negocio (superRefine) ────────

describe("investmentOperationInputSchema — buy: price requerido", () => {
  it("acepta buy con price_input", () => {
    expect(investmentOperationInputSchema.safeParse(BASE_OPERATION).success).toBe(true);
  });

  it("rechaza buy SIN price_input", () => {
    const { price_input: _, ...rest } = BASE_OPERATION;
    const result = investmentOperationInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const priceIssue = result.error.issues.find((i) => i.path.includes("price_input"));
      expect(priceIssue?.message).toBe("Price is required");
    }
  });
});

describe("investmentOperationInputSchema — sell: price requerido", () => {
  const SELL_BASE = { ...BASE_OPERATION, operation_type: "sell" };

  it("acepta sell con price_input", () => {
    expect(investmentOperationInputSchema.safeParse(SELL_BASE).success).toBe(true);
  });

  it("rechaza sell SIN price_input", () => {
    const { price_input: _, ...rest } = SELL_BASE;
    const result = investmentOperationInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const priceIssue = result.error.issues.find((i) => i.path.includes("price_input"));
      expect(priceIssue?.message).toBe("Price is required");
    }
  });
});

describe("investmentOperationInputSchema — dividend: price requerido, withholding permitido", () => {
  const DIVIDEND_BASE = {
    ...BASE_OPERATION,
    operation_type: "dividend",
    price_input: "0,35",
  };

  it("acepta dividend con price_input", () => {
    expect(investmentOperationInputSchema.safeParse(DIVIDEND_BASE).success).toBe(true);
  });

  it("acepta dividend con withholding_input", () => {
    expect(
      investmentOperationInputSchema.safeParse({
        ...DIVIDEND_BASE,
        withholding_input: "0,10",
      }).success,
    ).toBe(true);
  });

  it("rechaza dividend SIN price_input", () => {
    const { price_input: _, ...rest } = DIVIDEND_BASE;
    const result = investmentOperationInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("investmentOperationInputSchema — buy/sell: withholding PROHIBIDO", () => {
  it("rechaza withholding en buy", () => {
    const result = investmentOperationInputSchema.safeParse({
      ...BASE_OPERATION,
      withholding_input: "0,10",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("withholding_input"));
      expect(issue?.message).toBe("Withholding is only allowed for dividends");
    }
  });

  it("rechaza withholding en sell", () => {
    const result = investmentOperationInputSchema.safeParse({
      ...BASE_OPERATION,
      operation_type: "sell",
      withholding_input: "0,10",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("withholding_input"));
      expect(issue?.message).toBe("Withholding is only allowed for dividends");
    }
  });
});

describe("investmentOperationInputSchema — split: price/fee/withholding PROHIBIDOS", () => {
  const SPLIT_BASE = {
    operation_date: TODAY,
    operation_type: "split",
    quantity_input: "2",
  };

  it("acepta split mínimo (solo quantity_input)", () => {
    expect(investmentOperationInputSchema.safeParse(SPLIT_BASE).success).toBe(true);
  });

  it("rechaza split CON price_input", () => {
    const result = investmentOperationInputSchema.safeParse({
      ...SPLIT_BASE,
      price_input: "10,00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("price_input"));
      expect(issue?.message).toBe("Price is not allowed for splits");
    }
  });

  it("rechaza split CON fee_input", () => {
    const result = investmentOperationInputSchema.safeParse({
      ...SPLIT_BASE,
      fee_input: "5,00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("fee_input"));
      expect(issue?.message).toBe("Fee is not allowed for splits");
    }
  });

  it("rechaza split CON withholding_input", () => {
    const result = investmentOperationInputSchema.safeParse({
      ...SPLIT_BASE,
      withholding_input: "0,10",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes("withholding_input"));
      expect(issue?.message).toBe("Withholding is not allowed for splits");
    }
  });

  it("rechaza split CON los tres campos a la vez (3 issues)", () => {
    const result = investmentOperationInputSchema.safeParse({
      ...SPLIT_BASE,
      price_input: "10,00",
      fee_input: "5,00",
      withholding_input: "0,10",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("investmentOperationInputSchema — inyección de seguridad", () => {
  it("rechaza XSS en notes de operación", () => {
    expect(
      investmentOperationInputSchema.safeParse({
        ...BASE_OPERATION,
        notes: "<script>alert('xss')</script>",
      }).success,
    ).toBe(false);
  });

  it("rechaza null byte en quantity_input", () => {
    expect(
      investmentOperationInputSchema.safeParse({
        ...BASE_OPERATION,
        quantity_input: "100\x00",
      }).success,
    ).toBe(false);
  });

  it("rechaza user_id inyectado en operación (.strict())", () => {
    expect(
      investmentOperationInputSchema.safeParse({ ...BASE_OPERATION, user_id: VALID_UUID }).success,
    ).toBe(false);
  });

  it("rechaza position_id inyectado en operación (.strict())", () => {
    expect(
      investmentOperationInputSchema.safeParse({
        ...BASE_OPERATION,
        position_id: VALID_UUID,
      }).success,
    ).toBe(false);
  });

  it("rechaza operation_type no válido", () => {
    expect(
      investmentOperationInputSchema.safeParse({
        ...BASE_OPERATION,
        operation_type: "transfer",
      }).success,
    ).toBe(false);
  });
});

// ─── investmentSearchSchema ───────────────────────────────────────────────────

describe("investmentSearchSchema — seguridad y boundaries", () => {
  it("acepta búsqueda válida", () => {
    expect(investmentSearchSchema.safeParse({ q: "Iberdrola" }).success).toBe(true);
  });

  it("rechaza q vacío", () => {
    expect(investmentSearchSchema.safeParse({ q: "" }).success).toBe(false);
  });

  it("rechaza XSS en q", () => {
    expect(
      investmentSearchSchema.safeParse({ q: "<script>fetch('/api/delete')</script>" }).success,
    ).toBe(false);
  });

  it("rechaza null byte en q", () => {
    expect(investmentSearchSchema.safeParse({ q: "IBE\x00" }).success).toBe(false);
  });

  it("rechaza q > 60 caracteres", () => {
    expect(investmentSearchSchema.safeParse({ q: "A".repeat(61) }).success).toBe(false);
  });

  it("acepta limit = 1 (mínimo)", () => {
    expect(investmentSearchSchema.safeParse({ q: "IBE", limit: 1 }).success).toBe(true);
  });

  it("acepta limit = 10 (máximo)", () => {
    expect(investmentSearchSchema.safeParse({ q: "IBE", limit: 10 }).success).toBe(true);
  });

  it("rechaza limit = 0", () => {
    expect(investmentSearchSchema.safeParse({ q: "IBE", limit: 0 }).success).toBe(false);
  });

  it("rechaza limit = 11", () => {
    expect(investmentSearchSchema.safeParse({ q: "IBE", limit: 11 }).success).toBe(false);
  });

  it("rechaza campo user_id inyectado (.strict())", () => {
    expect(investmentSearchSchema.safeParse({ q: "IBE", user_id: VALID_UUID }).success).toBe(false);
  });
});

// ─── investmentExportSchema ───────────────────────────────────────────────────

describe("investmentExportSchema — year boundaries", () => {
  it("acepta año actual", () => {
    expect(investmentExportSchema.safeParse({ year: 2026 }).success).toBe(true);
  });

  it("rechaza año 2019 (antes del mínimo 2020)", () => {
    expect(investmentExportSchema.safeParse({ year: 2019 }).success).toBe(false);
  });

  it("rechaza año 2101 (sobre el máximo 2100)", () => {
    expect(investmentExportSchema.safeParse({ year: 2101 }).success).toBe(false);
  });

  it("rechaza year = 0", () => {
    expect(investmentExportSchema.safeParse({ year: 0 }).success).toBe(false);
  });

  it("rechaza year negativo", () => {
    expect(investmentExportSchema.safeParse({ year: -1 }).success).toBe(false);
  });

  it("rechaza campo user_id inyectado (.strict())", () => {
    expect(investmentExportSchema.safeParse({ year: 2026, user_id: VALID_UUID }).success).toBe(
      false,
    );
  });

  it("coerce acepta year como string '2026'", () => {
    expect(investmentExportSchema.safeParse({ year: "2026" }).success).toBe(true);
  });
});
