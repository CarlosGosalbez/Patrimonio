import { describe, expect, it } from "vitest";
import {
  detectColumnMapping,
  detectImportFileFormat,
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

  it("parses QIF content that contains blank lines", () => {
    const qif = "!Type:Bank\n\nD03/04/2026\nT2500,00\nPNOMINA EMPRESA\n^\n";
    const parsed = parseQifContent(qif, "extracto.qif");
    expect(parsed.rawRows).toHaveLength(1);
    expect(parsed.rawRows[0]?.[0]).toBe("03/04/2026");
  });
});

describe("detectImportFileFormat", () => {
  it("returns the correct format for each supported extension", () => {
    expect(detectImportFileFormat("movimientos.csv")).toBe("csv");
    expect(detectImportFileFormat("extracto.xlsx")).toBe("xlsx");
    expect(detectImportFileFormat("BBVA.XLS")).toBe("xls");
    expect(detectImportFileFormat("account.ofx")).toBe("ofx");
    expect(detectImportFileFormat("account.qif")).toBe("qif");
  });

  it("throws an error for unsupported file extensions", () => {
    expect(() => detectImportFileFormat("statement.pdf")).toThrow("Unsupported file format");
    expect(() => detectImportFileFormat("data.txt")).toThrow("Unsupported file format");
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

describe("detectSourceBank — all banks", () => {
  it("detects BBVA from filename and matching headers", () => {
    const bank = detectSourceBank(
      ["Fecha operación", "Descripción", "Importe"],
      "bbva_movimientos.csv",
    );
    expect(bank).toBe("bbva");
  });

  it("detects CaixaBank from filename and date-value header", () => {
    const bank = detectSourceBank(
      ["Fecha valor", "Descripción", "Importe"],
      "caixabank_movimientos.csv",
    );
    expect(bank).toBe("caixabank");
  });

  it("detects Sabadell from filename and headers", () => {
    const bank = detectSourceBank(["Fecha", "Concepto", "Importe"], "sabadell_may2026.csv");
    expect(bank).toBe("sabadell");
  });

  it("falls back to generic when no bank signature matches", () => {
    const bank = detectSourceBank(["Date", "Details", "Amount"], "my_bank_export.csv");
    expect(bank).toBe("generic");
  });
});

describe("normalizeStatementRows — edge cases", () => {
  it("infers income (ABONO) and expense (CARGO) from a type column", () => {
    const headers = ["Fecha", "Concepto", "Importe", "Tipo"];
    const rawRows = [
      ["01/04/2026", "NOMINA EMPRESA SA", "1500,00", "ABONO"],
      ["02/04/2026", "RECIBO LUZ ENDESA", "87,43", "CARGO"],
      ["03/04/2026", "DEVOLUCION HACIENDA", "200,00", "OTRO"],
    ];
    const bank = detectSourceBank(headers, "generic.csv");
    const mapping = detectColumnMapping(headers, rawRows, bank);
    const normalized = normalizeStatementRows({ mapping, rawRows });

    expect(normalized[0]?.is_income).toBe(true); // ABONO → income
    expect(normalized[1]?.is_income).toBe(false); // CARGO → expense
    expect(normalized[2]?.is_income).toBe(true); // OTRO → null → falls back to amount > 0
  });

  it("handles parenthesis notation (50,00) as a negative amount", () => {
    const headers = ["Fecha", "Concepto", "Importe"];
    const rawRows = [["01/04/2026", "CARGO BANCARIO COMISION", "(50,00)"]];
    const bank = detectSourceBank(headers, "generic.csv");
    const mapping = detectColumnMapping(headers, rawRows, bank);
    const normalized = normalizeStatementRows({ mapping, rawRows });

    expect(normalized[0]?.amount_cents).toBe(5000);
    expect(normalized[0]?.is_income).toBe(false);
  });

  it("skips rows with empty date or empty description", () => {
    const headers = ["Fecha", "Concepto", "Importe"];
    const rawRows = [
      ["", "NOMINA", "1500,00"], // no date → skip
      ["01/04/2026", "", "50,00"], // no description → skip
      ["01/04/2026", "NOMINA VALIDA", "1500,00"], // valid
    ];
    const bank = detectSourceBank(headers, "generic.csv");
    const mapping = detectColumnMapping(headers, rawRows, bank);
    const normalized = normalizeStatementRows({ mapping, rawRows });

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.description).toBe("NOMINA VALIDA");
  });

  it("handles credit/debit split columns (Abono / Cargo headers)", () => {
    const rawRows = [
      ["01/04/2026", "NOMINA EMPRESA", "1500,00", ""],
      ["02/04/2026", "RECIBO LUZ ENDESA", "", "87,43"],
    ];
    // Provide mapping explicitly: "Abono" = credit col, "Cargo" = debit col, no amount col
    const mapping = {
      transaction_date: 0,
      description: 1,
      credit: 2,
      debit: 3,
    };
    const normalized = normalizeStatementRows({ mapping, rawRows });

    expect(normalized[0]?.is_income).toBe(true);
    expect(normalized[0]?.amount_cents).toBe(150_000);
    expect(normalized[1]?.is_income).toBe(false);
    expect(normalized[1]?.amount_cents).toBe(8_743);
  });

  it("parses OFX-style date (YYYYMMDDHHMMSS) via normalizeStatementRows", () => {
    const mapping = { transaction_date: 0, description: 3, amount: 2 };
    const rawRows = [["20260401120000", "DEBIT", "-45.50", "MERCADONA"]];
    const normalized = normalizeStatementRows({ mapping, rawRows });

    expect(normalized[0]?.transaction_date).toBe("2026-04-01");
    expect(normalized[0]?.amount_cents).toBe(4550);
    expect(normalized[0]?.is_income).toBe(false);
  });

  it("parses slash date with 2-digit year (DD/MM/YY)", () => {
    const headers = ["Fecha", "Concepto", "Importe"];
    const rawRows = [["01/04/26", "TRANSF RECIBIDA NOMINA", "1000,00"]];
    const bank = detectSourceBank(headers, "generic.csv");
    const mapping = detectColumnMapping(headers, rawRows, bank);
    const normalized = normalizeStatementRows({ mapping, rawRows });

    expect(normalized[0]?.transaction_date).toBe("2026-04-01");
  });
});
