// ============================================================
// PHASE 7 — Reports & Export
// lib/reports/excel.ts — Full Excel export (transactions + summary + investments)
// ============================================================

import * as XLSX from "xlsx";
import { centsToDec, formatCurrency, formatDate } from "@/lib/financial/formatters";
import type { MonthlyReport, AnnualReport } from "@/lib/reports/types";

const CURRENCY = "EUR";

function currencyCell(cents: number): number {
  return centsToDec(cents);
}

function pctCell(value: number | null): string {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

// ─────────────────────────────────────────────────────────────
// Full Monthly Excel Export
// ─────────────────────────────────────────────────────────────

export function buildMonthlyExcel(
  report: MonthlyReport,
  transactions: Array<{
    transaction_date: string;
    description: string;
    amount_cents: number;
    is_income: boolean;
    currency: string;
    notes: string | null;
    category?: { name: string } | null;
    account?: { name: string } | null;
  }>,
): Buffer {
  const wb = XLSX.utils.book_new();

  // ── SHEET 1: Resumen ─────────────────────────────────────
  const summaryData = [
    ["Informe mensual — Patrimio", report.period.label],
    [],
    ["Concepto", "Importe (€)", "Vs mes anterior"],
    [
      "Ingresos",
      currencyCell(report.income_total_cents),
      pctCell(report.comparison.income_delta_pct),
    ],
    [
      "Gastos",
      currencyCell(report.expenses_total_cents),
      pctCell(report.comparison.expenses_delta_pct),
    ],
    ["Balance neto", currencyCell(report.net_balance_cents), ""],
    [
      "Tasa de ahorro",
      report.savings_rate_percent !== null ? `${report.savings_rate_percent}%` : "—",
      pctCell(report.comparison.savings_rate_delta),
    ],
    [],
    ["Top gastos del mes"],
    ["Fecha", "Descripción", "Categoría", "Importe (€)"],
    ...report.top_expenses.map((t) => [
      formatDate(t.transaction_date),
      t.description,
      t.category_name ?? "—",
      currencyCell(t.amount_cents),
    ]),
    [],
    ["Gastos por categoría"],
    ["Categoría", "Total (€)", "% del total"],
    ...report.expenses_by_category.map((c) => [
      c.category_name,
      currencyCell(c.amount_cents),
      `${c.percent_of_total.toFixed(1)}%`,
    ]),
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

  // ── SHEET 2: Transacciones ────────────────────────────────
  const txHeader = [
    "Fecha",
    "Tipo",
    "Descripción",
    "Categoría",
    "Cuenta",
    "Importe (€)",
    "Moneda",
    "Notas",
  ];
  const txRows = transactions.map((t) => [
    formatDate(t.transaction_date),
    t.is_income ? "Ingreso" : "Gasto",
    t.description,
    t.category?.name ?? "—",
    t.account?.name ?? "—",
    t.is_income ? currencyCell(t.amount_cents) : -currencyCell(t.amount_cents),
    t.currency,
    t.notes ?? "",
  ]);

  const wsTx = XLSX.utils.aoa_to_sheet([txHeader, ...txRows]);
  wsTx["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 32 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 8 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTx, "Transacciones");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ─────────────────────────────────────────────────────────────
// Full Annual Excel Export
// ─────────────────────────────────────────────────────────────

export function buildAnnualExcel(
  report: AnnualReport,
  transactions: Array<{
    transaction_date: string;
    description: string;
    amount_cents: number;
    is_income: boolean;
    currency: string;
    notes: string | null;
    category?: { name: string } | null;
    account?: { name: string } | null;
  }>,
  investments: Array<{
    name: string;
    ticker: string;
    investment_type: string;
    quantity: number;
    avg_purchase_price_cents: number;
    current_value_cents: number;
    unrealized_pl_cents?: number | null;
    currency: string;
  }>,
): Buffer {
  const wb = XLSX.utils.book_new();

  // ── SHEET 1: Resumen anual ───────────────────────────────
  const summaryData = [
    ["Informe anual — Patrimio", String(report.period.year)],
    [],
    ["Concepto", "Importe (€)", "Vs año anterior"],
    [
      "Ingresos totales",
      currencyCell(report.total_income_cents),
      pctCell(report.comparison_prev_year.income_delta_pct),
    ],
    [
      "Gastos totales",
      currencyCell(report.total_expenses_cents),
      pctCell(report.comparison_prev_year.expenses_delta_pct),
    ],
    ["Balance neto", currencyCell(report.total_net_cents), ""],
    [
      "Tasa de ahorro media",
      report.avg_savings_rate_percent !== null ? `${report.avg_savings_rate_percent}%` : "—",
      "",
    ],
    [],
    ["Evolución mensual"],
    ["Mes", "Ingresos (€)", "Gastos (€)", "Neto (€)", "Ahorro (%)"],
    ...report.monthly_series.map((m) => [
      m.label,
      currencyCell(m.income_cents),
      currencyCell(m.expenses_cents),
      currencyCell(m.net_cents),
      m.savings_rate_percent !== null ? `${m.savings_rate_percent}%` : "—",
    ]),
    [],
    ["Top gastos por categoría"],
    ["Categoría", "Total (€)", "% del total"],
    ...report.expenses_by_category.map((c) => [
      c.category_name,
      currencyCell(c.amount_cents),
      `${c.percent_of_total.toFixed(1)}%`,
    ]),
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

  // ── SHEET 2: Transacciones ────────────────────────────────
  const txHeader = [
    "Fecha",
    "Tipo",
    "Descripción",
    "Categoría",
    "Cuenta",
    "Importe (€)",
    "Moneda",
    "Notas",
  ];
  const txRows = transactions.map((t) => [
    formatDate(t.transaction_date),
    t.is_income ? "Ingreso" : "Gasto",
    t.description,
    t.category?.name ?? "—",
    t.account?.name ?? "—",
    t.is_income ? currencyCell(t.amount_cents) : -currencyCell(t.amount_cents),
    t.currency,
    t.notes ?? "",
  ]);

  const wsTx = XLSX.utils.aoa_to_sheet([txHeader, ...txRows]);
  wsTx["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 32 },
    { wch: 20 },
    { wch: 20 },
    { wch: 14 },
    { wch: 8 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTx, "Transacciones");

  // ── SHEET 3: Inversiones ─────────────────────────────────
  if (investments.length > 0) {
    const invHeader = [
      "Nombre",
      "Ticker",
      "Tipo",
      "Cantidad",
      "Precio medio (€)",
      "Valor actual (€)",
      "P&L no realizado (€)",
      "Moneda",
    ];
    const invRows = investments.map((inv) => [
      inv.name,
      inv.ticker,
      inv.investment_type,
      inv.quantity,
      currencyCell(inv.avg_purchase_price_cents),
      currencyCell(inv.current_value_cents),
      inv.unrealized_pl_cents != null ? currencyCell(inv.unrealized_pl_cents) : "—",
      inv.currency,
    ]);
    const wsInv = XLSX.utils.aoa_to_sheet([invHeader, ...invRows]);
    wsInv["!cols"] = [
      { wch: 28 },
      { wch: 10 },
      { wch: 14 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, wsInv, "Inversiones");
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
