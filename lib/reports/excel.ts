// ============================================================
// PHASE 7 — Reports & Export
// lib/reports/excel.ts — Full Excel export (transactions + summary + investments)
// ============================================================

import * as XLSX from "xlsx";
import { centsToDec, formatCurrency, formatDate } from "@/lib/financial/formatters";
import type { MonthlyReport, AnnualReport, GdprExportData } from "@/lib/reports/types";

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
// GDPR Full Data Export — Multi-sheet Excel
// ─────────────────────────────────────────────────────────────

function toRecord(item: unknown): Record<string, unknown> {
  return item != null && typeof item === "object" ? (item as Record<string, unknown>) : {};
}

function gdprSheetFromArray(rows: unknown[], label: string): XLSX.WorkSheet {
  if (rows.length === 0) {
    return XLSX.utils.aoa_to_sheet([[label], ["Sin datos"]]);
  }
  const first = toRecord(rows[0]);
  const headers = Object.keys(first);
  const data = rows.map((r) => headers.map((h) => toRecord(r)[h] ?? ""));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.min(Math.max(h.length + 4, 12), 40) }));
  return ws;
}

export function buildGdprExcel(exportData: GdprExportData): Buffer {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Resumen
  const summaryData: unknown[][] = [
    ["Patrimio — Exportación RGPD (GDPR)"],
    ["Exportado el", exportData.exported_at],
    ["Usuario", exportData.user_id],
    [],
    ["Hoja", "Registros"],
    ["Perfil", "1"],
    ["Cuentas", String(exportData.accounts.length)],
    ["Categorías", String(exportData.categories.length)],
    ["Transacciones", String(exportData.transactions.length)],
    ["Compromisos", String(exportData.recurring_commitments.length)],
    ["Inversiones", String(exportData.investments.length)],
    ["Operaciones inversión", String(exportData.investment_operations.length)],
    ["Presupuestos", String(exportData.budgets.length)],
    ["Notificaciones", String(exportData.notifications.length)],
    [],
    [
      "Aviso RGPD",
      "Datos exportados conforme al Reglamento (UE) 2016/679. Para más información: patrimio.app/privacidad",
    ],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

  // Sheet 2 — Perfil
  const profileRows = Object.entries(exportData.profile).map(([k, v]) => [
    k,
    typeof v === "object" ? JSON.stringify(v) : String(v ?? ""),
  ]);
  const wsProfile = XLSX.utils.aoa_to_sheet([["Campo", "Valor"], ...profileRows]);
  wsProfile["!cols"] = [{ wch: 24 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsProfile, "Perfil");

  // Sheet 3 — Cuentas
  XLSX.utils.book_append_sheet(wb, gdprSheetFromArray(exportData.accounts, "Cuentas"), "Cuentas");

  // Sheet 4 — Transacciones
  XLSX.utils.book_append_sheet(
    wb,
    gdprSheetFromArray(exportData.transactions, "Transacciones"),
    "Transacciones",
  );

  // Sheet 5 — Compromisos recurrentes
  XLSX.utils.book_append_sheet(
    wb,
    gdprSheetFromArray(exportData.recurring_commitments, "Compromisos"),
    "Compromisos",
  );

  // Sheet 6 — Inversiones
  XLSX.utils.book_append_sheet(
    wb,
    gdprSheetFromArray(exportData.investments, "Inversiones"),
    "Inversiones",
  );

  // Sheet 7 — Operaciones de inversión
  XLSX.utils.book_append_sheet(
    wb,
    gdprSheetFromArray(exportData.investment_operations, "Operaciones"),
    "Operaciones inv.",
  );

  // Sheet 8 — Presupuestos
  XLSX.utils.book_append_sheet(
    wb,
    gdprSheetFromArray(exportData.budgets, "Presupuestos"),
    "Presupuestos",
  );

  // Sheet 9 — Notificaciones
  XLSX.utils.book_append_sheet(
    wb,
    gdprSheetFromArray(exportData.notifications, "Notificaciones"),
    "Notificaciones",
  );

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

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

// ─────────────────────────────────────────────────────────────
// Account-level Transaction Export
// ─────────────────────────────────────────────────────────────

export function buildAccountExcel(
  accountName: string,
  transactions: Array<{
    transaction_date: string;
    description: string;
    amount_cents: number;
    is_income: boolean;
    currency: string;
    notes: string | null;
    category?: { name: string } | null;
  }>,
): Buffer {
  const wb = XLSX.utils.book_new();

  const totalIncomeCents = transactions
    .filter((t) => t.is_income)
    .reduce((sum, t) => sum + t.amount_cents, 0);
  const totalExpensesCents = transactions
    .filter((t) => !t.is_income)
    .reduce((sum, t) => sum + t.amount_cents, 0);

  // ── SHEET 1: Resumen ─────────────────────────────────────
  const summaryData = [
    ["Informe de cuenta — Patrimio", accountName],
    ["Generado el", formatDate(new Date().toISOString().slice(0, 10))],
    [],
    ["Concepto", "Importe (€)"],
    ["Total ingresos", currencyCell(totalIncomeCents)],
    ["Total gastos", currencyCell(totalExpensesCents)],
    ["Balance neto", currencyCell(totalIncomeCents - totalExpensesCents)],
    [],
    ["Total transacciones", transactions.length],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 22 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

  // ── SHEET 2: Transacciones ────────────────────────────────
  const txHeader = ["Fecha", "Tipo", "Descripción", "Categoría", "Importe (€)", "Moneda", "Notas"];
  const txRows = transactions.map((t) => [
    formatDate(t.transaction_date),
    t.is_income ? "Ingreso" : "Gasto",
    t.description,
    t.category?.name ?? "—",
    t.is_income ? currencyCell(t.amount_cents) : -currencyCell(t.amount_cents),
    t.currency,
    t.notes ?? "",
  ]);

  const wsTx = XLSX.utils.aoa_to_sheet([txHeader, ...txRows]);
  wsTx["!cols"] = [
    { wch: 12 },
    { wch: 10 },
    { wch: 36 },
    { wch: 20 },
    { wch: 14 },
    { wch: 8 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTx, "Transacciones");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
