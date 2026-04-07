import { describe, expect, it } from "vitest";
import {
  detectColumnMapping,
  detectSourceBank,
  normalizeStatementRows,
  parseOfxContent,
  parseQifContent,
} from "@/lib/imports/parser";

describe("imports parser", () => {
  it("detects Santander-like headers and normalizes amount rows", () => {
    const headers = ["Fecha", "Concepto", "Importe", "Fecha valor"];
    const rawRows = [
      ["01/04/2026", "NETFLIX MADRID", "-15,99", "02/04/2026"],
      ["03/04/2026", "NOMINA ACME", "2500,00", "03/04/2026"],
    ];

    const bank = detectSourceBank(headers, "santander_abril.csv");
    const mapping = detectColumnMapping(headers, rawRows, bank);
    const normalized = normalizeStatementRows({ mapping, rawRows });

    expect(bank).toBe("santander");
    expect(mapping.transaction_date).toBe(0);
    expect(mapping.description).toBe(1);
    expect(mapping.amount).toBe(2);
    expect(normalized).toEqual([
      expect.objectContaining({
        amount_cents: 1599,
        description: "NETFLIX MADRID",
        is_income: false,
        transaction_date: "2026-04-01",
        value_date: "2026-04-02",
      }),
      expect.objectContaining({
        amount_cents: 250000,
        is_income: true,
        transaction_date: "2026-04-03",
      }),
    ]);
  });

  it("detects ING Excel columns (F. VALOR | CATEGORÍA | SUBCATEGORÍA | DESCRIPCIÓN | COMENTARIO | IMPORTE (€) | SALDO (€))", () => {
    const headers = [
      "F. VALOR",
      "CATEGORÍA",
      "SUBCATEGORÍA",
      "DESCRIPCIÓN",
      "COMENTARIO",
      "IMPORTE (€)",
      "SALDO (€)",
    ];
    const rawRows = [
      ["01/04/2026", "Alimentación", "Supermercados", "MERCADONA", "", "-45,00", "1200,00"],
      ["03/04/2026", "Nómina", "", "TRANSFERENCIA EMPR", "", "2100,00", "3300,00"],
    ];

    const bank = detectSourceBank(headers, "movimientos_ing.xlsx");
    const mapping = detectColumnMapping(headers, rawRows, bank);
    const normalized = normalizeStatementRows({ mapping, rawRows });

    expect(bank).toBe("ing");
    // IMPORTE (€) colum must be detected as amount
    expect(mapping.amount).toBe(5);
    // DESCRIPCIÓN must be detected as description
    expect(mapping.description).toBe(3);
    // F. VALOR fallback for transaction_date
    expect(normalized[0]?.transaction_date).toBe("2026-04-01");
    expect(normalized[0]?.amount_cents).toBe(4500);
    expect(normalized[0]?.is_income).toBe(false);
    expect(normalized[1]?.amount_cents).toBe(210000);
    expect(normalized[1]?.is_income).toBe(true);
  });

  it("parses OFX transaction blocks into rows", () => {
    const ofx = `
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>20260402120000
            <TRNAMT>-45.50
            <FITID>abc-1
            <NAME>MERCADONA
            <MEMO>Compra semanal
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
`.trim();

    const parsed = parseOfxContent(ofx, "extracto.ofx");

    expect(parsed.sourceFormat).toBe("ofx");
    expect(parsed.rawRows).toEqual([
      ["20260402120000", "", "-45.50", "DEBIT", "MERCADONA", "Compra semanal", "abc-1"],
    ]);
  });

  it("parses QIF records into rows", () => {
    const qif = `
!Type:Bank
D02/04/2026
T-19.90
PNETFLIX
MPlan premium
NDEP
^
`.trim();

    const parsed = parseQifContent(qif, "extracto.qif");

    expect(parsed.sourceFormat).toBe("qif");
    expect(parsed.rawRows).toEqual([["02/04/2026", "-19.90", "NETFLIX", "Plan premium", "DEP"]]);
  });
});

describe("imports parser", () => {
  it("detects Santander-like headers and normalizes amount rows", () => {
    const headers = ["Fecha", "Concepto", "Importe", "Fecha valor"];
    const rawRows = [
      ["01/04/2026", "NETFLIX MADRID", "-15,99", "02/04/2026"],
      ["03/04/2026", "NOMINA ACME", "2500,00", "03/04/2026"],
    ];

    const bank = detectSourceBank(headers, "santander_abril.csv");
    const mapping = detectColumnMapping(headers, rawRows, bank);
    const normalized = normalizeStatementRows({ mapping, rawRows });

    expect(bank).toBe("santander");
    expect(mapping.transaction_date).toBe(0);
    expect(mapping.description).toBe(1);
    expect(mapping.amount).toBe(2);
    expect(normalized).toEqual([
      expect.objectContaining({
        amount_cents: 1599,
        description: "NETFLIX MADRID",
        is_income: false,
        transaction_date: "2026-04-01",
        value_date: "2026-04-02",
      }),
      expect.objectContaining({
        amount_cents: 250000,
        is_income: true,
        transaction_date: "2026-04-03",
      }),
    ]);
  });

  it("parses OFX transaction blocks into rows", () => {
    const ofx = `
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <STMTTRN>
            <TRNTYPE>DEBIT
            <DTPOSTED>20260402120000
            <TRNAMT>-45.50
            <FITID>abc-1
            <NAME>MERCADONA
            <MEMO>Compra semanal
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
`.trim();

    const parsed = parseOfxContent(ofx, "extracto.ofx");

    expect(parsed.sourceFormat).toBe("ofx");
    expect(parsed.rawRows).toEqual([
      ["20260402120000", "", "-45.50", "DEBIT", "MERCADONA", "Compra semanal", "abc-1"],
    ]);
  });

  it("parses QIF records into rows", () => {
    const qif = `
!Type:Bank
D02/04/2026
T-19.90
PNETFLIX
MPlan premium
NDEP
^
`.trim();

    const parsed = parseQifContent(qif, "extracto.qif");

    expect(parsed.sourceFormat).toBe("qif");
    expect(parsed.rawRows).toEqual([["02/04/2026", "-19.90", "NETFLIX", "Plan premium", "DEP"]]);
  });
});
