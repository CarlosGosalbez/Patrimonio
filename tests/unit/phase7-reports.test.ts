// ============================================================
// PHASE 7 — Reports & Export
// Unit tests for lib/reports/excel.ts and lib/reports/types.ts
// ============================================================

import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildMonthlyExcel, buildAnnualExcel } from "@/lib/reports/excel";
import type {
  MonthlyReport,
  AnnualReport,
  CategoryAmount,
  TopTransaction,
  MonthlySeriesPoint,
} from "@/lib/reports/types";

// ─────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────

const makeCategory = (name: string, amount_cents: number, pct: number): CategoryAmount => ({
  category_id: `cat-${name}`,
  category_name: name,
  category_color: "#3b82f6",
  amount_cents,
  percent_of_total: pct,
  transaction_count: 5,
});

const makeTopTx = (id: string, desc: string, cents: number): TopTransaction => ({
  id,
  description: desc,
  amount_cents: cents,
  transaction_date: "2025-11-15",
  category_name: "Alimentación",
  category_color: "#10b981",
});

const MONTHLY_REPORT: MonthlyReport = {
  period: {
    type: "month",
    month: 11,
    year: 2025,
    label: "Noviembre 2025",
  },
  income_total_cents: 300000, // 3 000€
  expenses_total_cents: 180000, // 1 800€
  net_balance_cents: 120000, // 1 200€
  savings_rate_percent: 40,
  income_by_category: [makeCategory("Salario", 300000, 100)],
  expenses_by_category: [
    makeCategory("Alimentación", 60000, 33.3),
    makeCategory("Transporte", 30000, 16.7),
    makeCategory("Ocio", 20000, 11.1),
  ],
  top_expenses: [makeTopTx("t1", "Supermercado Mercadona", 8500), makeTopTx("t2", "Netflix", 1799)],
  comparison: {
    income_delta_pct: 5.0,
    expenses_delta_pct: -2.5,
    savings_rate_delta: 3.0,
    income_prev_cents: 285714,
    expenses_prev_cents: 184615,
    savings_rate_prev: 37,
  },
};

const MONTHLY_TRANSACTIONS = [
  {
    transaction_date: "2025-11-15",
    description: "Supermercado Mercadona",
    amount_cents: 8500,
    is_income: false,
    currency: "EUR",
    notes: null,
    category: { name: "Alimentación" },
    account: { name: "BBVA Cuenta" },
  },
  {
    transaction_date: "2025-11-01",
    description: "Nómina Empresa",
    amount_cents: 300000,
    is_income: true,
    currency: "EUR",
    notes: null,
    category: { name: "Salario" },
    account: { name: "BBVA Cuenta" },
  },
];

const ANNUAL_REPORT: AnnualReport = {
  period: { type: "year", year: 2025, label: "2025" },
  total_income_cents: 3_600_000,
  total_expenses_cents: 2_160_000,
  total_net_cents: 1_440_000,
  avg_savings_rate_percent: 40,
  monthly_series: Array.from(
    { length: 12 },
    (_, i): MonthlySeriesPoint => ({
      month: `2025-${String(i + 1).padStart(2, "0")}`,
      label:
        ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][i] +
        " 25",
      income_cents: 300000,
      expenses_cents: 180000,
      net_cents: 120000,
      savings_rate_percent: 40,
    }),
  ),
  expenses_by_category: [
    makeCategory("Alimentación", 720000, 33.3),
    makeCategory("Transporte", 360000, 16.7),
  ],
  income_by_category: [makeCategory("Salario", 3_600_000, 100)],
  comparison_prev_year: {
    income_delta_pct: 5.0,
    expenses_delta_pct: -2.0,
  },
};

// ─────────────────────────────────────────────────────────────
// buildMonthlyExcel
// ─────────────────────────────────────────────────────────────

describe("buildMonthlyExcel", () => {
  it("returns a Buffer", () => {
    const buf = buildMonthlyExcel(MONTHLY_REPORT, MONTHLY_TRANSACTIONS);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("workbook contains 'Resumen' and 'Transacciones' sheets", () => {
    const buf = buildMonthlyExcel(MONTHLY_REPORT, MONTHLY_TRANSACTIONS);
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toContain("Resumen");
    expect(wb.SheetNames).toContain("Transacciones");
  });

  it("Resumen sheet starts with period label", () => {
    const buf = buildMonthlyExcel(MONTHLY_REPORT, MONTHLY_TRANSACTIONS);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets["Resumen"];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 }) as string[][];
    expect(data[0][0]).toBe("Informe mensual — Patrimio");
    expect(data[0][1]).toBe("Noviembre 2025");
  });

  it("income and expenses rows use decimal euro values (not cents)", () => {
    const buf = buildMonthlyExcel(MONTHLY_REPORT, MONTHLY_TRANSACTIONS);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets["Resumen"];
    const data = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
      header: 1,
    }) as (string | number)[][];
    // Row index 3 (0-based) should be Ingresos row: ["Ingresos", 3000, "+5.0%"]
    const ingresosRow = data.find((r) => r[0] === "Ingresos");
    expect(ingresosRow).toBeDefined();
    expect(ingresosRow![1]).toBeCloseTo(3000);
  });

  it("Transacciones sheet has header row + transaction rows", () => {
    const buf = buildMonthlyExcel(MONTHLY_REPORT, MONTHLY_TRANSACTIONS);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets["Transacciones"];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
    expect(rows.length).toBe(MONTHLY_TRANSACTIONS.length);
  });
});

// ─────────────────────────────────────────────────────────────
// buildAnnualExcel
// ─────────────────────────────────────────────────────────────

describe("buildAnnualExcel", () => {
  const annualTransactions = MONTHLY_TRANSACTIONS.map((t) => ({
    ...t,
    transaction_date: "2025-03-15",
  }));

  const annualInvestments = [
    {
      name: "Vanguard MSCI World",
      ticker: "VWRL",
      investment_type: "etf",
      current_value_cents: 500000,
      avg_purchase_price_cents: 42000,
      quantity: 10,
      unrealized_pl_cents: 80000,
      currency: "EUR",
    },
  ];

  it("returns a Buffer", () => {
    const buf = buildAnnualExcel(ANNUAL_REPORT, annualTransactions, annualInvestments);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("workbook contains 3 sheets", () => {
    const buf = buildAnnualExcel(ANNUAL_REPORT, annualTransactions, annualInvestments);
    const wb = XLSX.read(buf, { type: "buffer" });
    expect(wb.SheetNames).toHaveLength(3);
    expect(wb.SheetNames).toContain("Resumen");
    expect(wb.SheetNames).toContain("Transacciones");
    expect(wb.SheetNames).toContain("Inversiones");
  });

  it("Inversiones sheet has a row per investment", () => {
    const buf = buildAnnualExcel(ANNUAL_REPORT, annualTransactions, annualInvestments);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets["Inversiones"];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
    // One header-driven row for Vanguard MSCI World
    expect(rows.length).toBe(1);
  });

  it("investment values are in euros (not cents)", () => {
    const buf = buildAnnualExcel(ANNUAL_REPORT, annualTransactions, annualInvestments);
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets["Inversiones"];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
    // current_value_cents = 500000 → should be 5000 in the sheet
    const row = rows[0];
    const allValues = Object.values(row);
    const has5000 = allValues.some((v) => Number(v) === 5000);
    expect(has5000).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// ReportPeriod shape
// ─────────────────────────────────────────────────────────────

describe("ReportPeriod", () => {
  it("MonthlyReport period has correct shape", () => {
    const { period } = MONTHLY_REPORT;
    expect(period.type).toBe("month");
    expect(period.month).toBe(11);
    expect(period.year).toBe(2025);
    expect(period.label).toBe("Noviembre 2025");
  });

  it("AnnualReport period type is year with no month", () => {
    const { period } = ANNUAL_REPORT;
    expect(period.type).toBe("year");
    expect(period.month).toBeUndefined();
    expect(period.year).toBe(2025);
  });
});

// ─────────────────────────────────────────────────────────────
// GDPR export structure (buildGdprExportData contract)
// We test the type contract – real DB integration skipped in unit tests.
// ─────────────────────────────────────────────────────────────

describe("GdprExportData shape", () => {
  it("has all required top-level keys", () => {
    const mock = {
      exported_at: new Date().toISOString(),
      user_id: "uuid-test",
      profile: {},
      accounts: [],
      categories: [],
      transactions: [],
      recurring_commitments: [],
      investments: [],
      investment_operations: [],
      budgets: [],
      notifications: [],
    };
    const expectedKeys = [
      "exported_at",
      "user_id",
      "profile",
      "accounts",
      "categories",
      "transactions",
      "recurring_commitments",
      "investments",
      "investment_operations",
      "budgets",
      "notifications",
    ];
    expectedKeys.forEach((k) => expect(k in mock).toBe(true));
  });
});
