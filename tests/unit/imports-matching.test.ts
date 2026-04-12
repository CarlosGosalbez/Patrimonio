import { describe, expect, it } from "vitest";
import {
  buildImportDedupeKey,
  descriptionSimilarity,
  detectDuplicateRowsInFile,
  detectPossibleDuplicate,
  detectUnexpectedCharge,
  suggestCategory,
} from "@/lib/imports/matching";

describe("imports matching", () => {
  it("detects likely duplicate transactions with fuzzy description", () => {
    const candidate = detectPossibleDuplicate(
      "account-1",
      {
        amount_cents: 1599,
        description: "NETFLIX MADRID",
        external_id: null,
        is_income: false,
        merchant_key: "netflix madrid",
        notes: null,
        source_row_index: 0,
        transaction_date: "2026-04-01",
        value_date: null,
      },
      [
        {
          account_id: "account-1",
          amount_cents: 1599,
          description: "Netflix Madrid ES",
          id: "tx-1",
          transaction_date: "2026-04-02",
        },
      ],
    );

    expect(candidate).toEqual(
      expect.objectContaining({
        existing_id: "tx-1",
      }),
    );
    expect(candidate?.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it("applies user categorization rules before merchant heuristics", () => {
    const suggestion = suggestCategory(
      {
        amount_cents: 4990,
        description: "PAGO ENDESA MARZO",
        external_id: null,
        is_income: false,
        merchant_key: "endesa marzo",
        notes: null,
        source_row_index: 0,
        transaction_date: "2026-03-28",
        value_date: null,
      },
      [
        {
          category_id: "cat-utilities",
          is_case_sensitive: false,
          is_regex: false,
          pattern: "ENDESA",
          priority: 100,
        },
      ],
      [
        {
          color: null,
          icon: null,
          id: "cat-utilities",
          is_income: false,
          name: "Suministros (luz, agua, gas)",
          user_id: null,
        },
      ],
    );

    expect(suggestion).toEqual(
      expect.objectContaining({
        category_id: "cat-utilities",
        source: "rule",
      }),
    );
  });

  it("flags unexpected charges against cancelled subscriptions", () => {
    const unexpected = detectUnexpectedCharge(
      {
        amount_cents: 1299,
        description: "SPOTIFY FAMILY",
        external_id: null,
        is_income: false,
        merchant_key: "spotify family",
        notes: null,
        source_row_index: 1,
        transaction_date: "2026-04-05",
        value_date: null,
      },
      [
        {
          cancelled_at: "2026-03-15T00:00:00+00:00",
          id: "commitment-1",
          name: "Spotify",
          service_name: "Spotify",
        },
      ],
    );

    expect(unexpected).toEqual(
      expect.objectContaining({
        commitment_id: "commitment-1",
        service_name: "Spotify",
      }),
    );
  });

  it("computes normalized similarity for merchant names", () => {
    expect(descriptionSimilarity("Nómina ACME, S.L.", "Nomina ACME SL")).toBeGreaterThan(0.9);
  });
});

describe("descriptionSimilarity — edge cases", () => {
  it("returns 0 when either string is empty", () => {
    expect(descriptionSimilarity("", "Netflix")).toBe(0);
    expect(descriptionSimilarity("Netflix", "")).toBe(0);
  });

  it("returns 1 for exact match after normalization", () => {
    expect(descriptionSimilarity("Netflix", "Netflix")).toBe(1);
  });

  it("returns 0.92 when one string contains the other", () => {
    expect(descriptionSimilarity("Netflix Spain", "Netflix")).toBe(0.92);
    expect(descriptionSimilarity("Netflix", "Netflix Spain")).toBe(0.92);
  });

  it("returns partial overlap score for partially matching tokens", () => {
    const score = descriptionSimilarity("PAGO RECIBO GAS", "RECIBO ACS GAS");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe("buildImportDedupeKey", () => {
  const row = {
    amount_cents: 1599,
    description: "Netflix ES",
    external_id: null,
    is_income: false,
    merchant_key: null,
    notes: null,
    source_row_index: 0,
    transaction_date: "2026-04-01",
    value_date: null,
  };

  it("includes accountId, date, amount and normalized description", () => {
    const key = buildImportDedupeKey("account-1", row);
    expect(key).toContain("account-1");
    expect(key).toContain("2026-04-01");
    expect(key).toContain("1599");
  });
});

describe("detectDuplicateRowsInFile", () => {
  it("counts duplicate rows with same date/amount/description", () => {
    const rows = [
      {
        amount_cents: 1599,
        description: "Netflix",
        transaction_date: "2026-04-01",
        external_id: null,
        is_income: false,
        merchant_key: null,
        notes: null,
        source_row_index: 0,
        value_date: null,
      },
      {
        amount_cents: 1599,
        description: "Netflix",
        transaction_date: "2026-04-01",
        external_id: null,
        is_income: false,
        merchant_key: null,
        notes: null,
        source_row_index: 1,
        value_date: null,
      },
    ];
    const counts = detectDuplicateRowsInFile(rows);
    // Should detect 1 unique key with count 2
    let maxCount = 0;
    for (const count of counts.values()) {
      maxCount = Math.max(maxCount, count);
    }
    expect(maxCount).toBe(2);
  });
});

describe("detectPossibleDuplicate — reason branches", () => {
  const baseRow = {
    amount_cents: 999,
    external_id: null,
    is_income: false,
    merchant_key: null,
    notes: null,
    source_row_index: 0,
    value_date: null,
  };

  it("returns reason=fuzzy_date when similarity >= 0.75 and dayDistance > 0", () => {
    // "LIDL COMPRA" vs "LIDL" — substring match => similarity 0.92, dayDistance = 1
    const candidate = detectPossibleDuplicate(
      "account-1",
      { ...baseRow, description: "LIDL COMPRA", transaction_date: "2026-04-01" },
      [
        {
          account_id: "account-1",
          amount_cents: 999,
          description: "LIDL",
          id: "tx-fuzzy-date",
          transaction_date: "2026-04-02",
        },
      ],
    );

    expect(candidate).not.toBeNull();
    expect(candidate?.reason).toBe("fuzzy_date");
    expect(candidate?.existing_id).toBe("tx-fuzzy-date");
  });

  it("returns reason=fuzzy_description when similarity >= 0.75, < 0.95 and dayDistance === 0", () => {
    // "NETFLIX SPAIN ES" contains "NETFLIX" → similarity = 0.92 (substring branch), dayDistance = 0
    // 0.92 >= 0.75 ✓, 0.92 < 0.95 ✓, dayDistance === 0 → reason = "fuzzy_description"
    const candidate = detectPossibleDuplicate(
      "account-1",
      { ...baseRow, description: "NETFLIX SPAIN ES", transaction_date: "2026-04-01" },
      [
        {
          account_id: "account-1",
          amount_cents: 999,
          description: "NETFLIX",
          id: "tx-fuzzy-desc",
          transaction_date: "2026-04-01",
        },
      ],
    );

    expect(candidate).not.toBeNull();
    expect(candidate?.reason).toBe("fuzzy_description");
    expect(candidate?.existing_id).toBe("tx-fuzzy-desc");
  });

  it("returns null when similarity < 0.75", () => {
    const candidate = detectPossibleDuplicate(
      "account-1",
      { ...baseRow, description: "MERCADONA COMPRA SEMANAL", transaction_date: "2026-04-01" },
      [
        {
          account_id: "account-1",
          amount_cents: 999,
          description: "SPOTIFY PREMIUM",
          id: "tx-no-match",
          transaction_date: "2026-04-01",
        },
      ],
    );

    expect(candidate).toBeNull();
  });
});

describe("detectUnexpectedCharge — date comparison branch", () => {
  const baseRow = {
    amount_cents: 1299,
    external_id: null,
    is_income: false,
    merchant_key: null,
    notes: null,
    source_row_index: 0,
    value_date: null,
  };

  it("returns null when transaction_date is before or equal to cancelled_at (expected charge)", () => {
    // Transaction is BEFORE cancellation — charge was expected
    const result = detectUnexpectedCharge(
      { ...baseRow, description: "NETFLIX ES", transaction_date: "2026-03-10" },
      [
        {
          cancelled_at: "2026-03-15T00:00:00+00:00",
          id: "commitment-2",
          name: "Netflix",
          service_name: "Netflix",
        },
      ],
    );

    expect(result).toBeNull();
  });
});

describe("suggestCategory — merchant hint with no matching user category", () => {
  it("returns category_id null when merchant matches hint but no user category name matches", () => {
    // Merchant "MERCADONA" matches the grocery hint, but user has no category matching /alimentac/i
    const suggestion = suggestCategory(
      {
        amount_cents: 4990,
        description: "MERCADONA SUPERMERCADO",
        external_id: null,
        is_income: false,
        merchant_key: "mercadona",
        notes: null,
        source_row_index: 0,
        transaction_date: "2026-04-01",
        value_date: null,
      },
      [], // no user rules
      [
        {
          color: null,
          icon: null,
          id: "cat-transport",
          is_income: false,
          name: "Transporte",
          user_id: "user-1",
        },
      ], // no category matching "alimentac/i" or "supermercado/i"
    );

    expect(suggestion.category_id).toBeNull();
    expect(suggestion.source).toBeNull();
  });
});

describe("suggestCategory — additional branches", () => {
  const baseRow = {
    amount_cents: 1299,
    description: "STARBUCKS ES",
    external_id: null,
    is_income: false,
    merchant_key: "starbucks es",
    notes: null,
    source_row_index: 0,
    transaction_date: "2026-04-05",
    value_date: null,
  };

  it("matches via case-sensitive regex rule", () => {
    const suggestion = suggestCategory(
      baseRow,
      [
        {
          category_id: "cat-cafe",
          is_case_sensitive: true,
          is_regex: true,
          pattern: "STARBUCKS",
          priority: 100,
        },
      ],
      [],
    );
    expect(suggestion.source).toBe("rule");
    expect(suggestion.category_id).toBe("cat-cafe");
  });

  it("returns null suggestion when no rule or merchant hint matches", () => {
    const suggestion = suggestCategory(
      { ...baseRow, description: "XXXXXXXX99", merchant_key: null },
      [],
      [],
    );
    expect(suggestion.source).toBeNull();
    expect(suggestion.category_id).toBeNull();
    expect(suggestion.confidence).toBe(0);
  });

  it("returns null when regex rule is invalid", () => {
    const suggestion = suggestCategory(
      baseRow,
      [
        {
          category_id: "cat-invalid",
          is_case_sensitive: false,
          is_regex: true,
          pattern: "[invalid((regex",
          priority: 50,
        },
      ],
      [],
    );
    // Invalid regex should not match → falls through to null
    expect(suggestion.source).toBeNull();
  });
});

describe("detectUnexpectedCharge — additional branches", () => {
  const baseRow = {
    amount_cents: 1299,
    description: "Netflix",
    external_id: null,
    is_income: false,
    merchant_key: null,
    notes: null,
    source_row_index: 0,
    transaction_date: "2026-04-05",
    value_date: null,
  };

  it("returns null when row is income", () => {
    const result = detectUnexpectedCharge({ ...baseRow, is_income: true }, [
      { cancelled_at: "2026-03-01T00:00:00Z", id: "c1", name: "Netflix", service_name: "Netflix" },
    ]);
    expect(result).toBeNull();
  });

  it("returns null when commitment service_name is null", () => {
    const result = detectUnexpectedCharge(baseRow, [
      { cancelled_at: "2026-03-01T00:00:00Z", id: "c2", name: "Unknown", service_name: null },
    ]);
    expect(result).toBeNull();
  });
});
