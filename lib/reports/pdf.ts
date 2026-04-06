// ============================================================
// PHASE 7 — Reports & Export
// lib/reports/pdf.ts — Server-side PDF generation via @react-pdf/renderer
// ============================================================

import React from "react";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { centsToDec, formatDate } from "@/lib/financial/formatters";
import type { MonthlyReport, AnnualReport, FiscalReport } from "@/lib/reports/types";

// Register a more readable font (system fallback)
Font.registerHyphenationCallback((word) => [word]);

const BRAND_BLUE = "#2563eb";
const BRAND_GREEN = "#059669";
const BRAND_RED = "#dc2626";
const TEXT_MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const BG_HEADER = "#f9fafb";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111827",
    padding: 40,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_BLUE,
  },
  brandName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: BRAND_BLUE,
  },
  brandTagline: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  reportTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  reportSubtitle: {
    fontSize: 8,
    color: TEXT_MUTED,
    textAlign: "right",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND_BLUE,
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowHeader: {
    flexDirection: "row",
    paddingVertical: 4,
    backgroundColor: BG_HEADER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  col1: { flex: 3 },
  col2: { flex: 2, textAlign: "right" },
  col3: { flex: 2, textAlign: "right" },
  headerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: TEXT_MUTED,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 10,
  },
  kpiLabel: {
    fontSize: 7,
    color: TEXT_MUTED,
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
  },
  kpiDelta: {
    fontSize: 8,
    marginTop: 2,
  },
  positive: { color: BRAND_GREEN },
  negative: { color: BRAND_RED },
  neutral: { color: TEXT_MUTED },
  disclaimer: {
    marginTop: 24,
    padding: 8,
    backgroundColor: BG_HEADER,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_BLUE,
    fontSize: 7,
    color: TEXT_MUTED,
    lineHeight: 1.6,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: TEXT_MUTED,
  },
});

function formatEur(cents: number): string {
  const v = centsToDec(cents);
  const formatted = new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(v));
  return `${v < 0 ? "-" : ""}${formatted} €`;
}

function deltaText(pct: number | null): string {
  if (pct === null) return "";
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% vs anterior`;
}

function deltaStyle(pct: number | null, invert = false) {
  if (pct === null) return styles.neutral;
  const positive = invert ? pct < 0 : pct >= 0;
  return positive ? styles.positive : styles.negative;
}

// ─────────────────────────────────────────────────────────────
// Monthly Report PDF
// ─────────────────────────────────────────────────────────────

function MonthlyReportDocument({ report }: { report: MonthlyReport }) {
  const generatedAt = new Date().toLocaleDateString("es-ES");

  return React.createElement(
    Document,
    { title: `Informe mensual ${report.period.label} — Patrimio` },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.brandName }, "Patrimio"),
          React.createElement(
            Text,
            { style: styles.brandTagline },
            "Gestión de patrimonio personal",
          ),
        ),
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.reportTitle }, "Informe Mensual"),
          React.createElement(Text, { style: styles.reportSubtitle }, report.period.label),
          React.createElement(Text, { style: styles.reportSubtitle }, `Generado el ${generatedAt}`),
        ),
      ),

      // KPI row
      React.createElement(
        View,
        { style: styles.kpiGrid },
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(Text, { style: styles.kpiLabel }, "INGRESOS"),
          React.createElement(
            Text,
            { style: [styles.kpiValue, styles.positive] },
            formatEur(report.income_total_cents),
          ),
          React.createElement(
            Text,
            { style: [styles.kpiDelta, deltaStyle(report.comparison.income_delta_pct)] },
            deltaText(report.comparison.income_delta_pct),
          ),
        ),
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(Text, { style: styles.kpiLabel }, "GASTOS"),
          React.createElement(
            Text,
            { style: [styles.kpiValue, styles.negative] },
            formatEur(report.expenses_total_cents),
          ),
          React.createElement(
            Text,
            { style: [styles.kpiDelta, deltaStyle(report.comparison.expenses_delta_pct, true)] },
            deltaText(report.comparison.expenses_delta_pct),
          ),
        ),
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(Text, { style: styles.kpiLabel }, "BALANCE"),
          React.createElement(
            Text,
            {
              style: [
                styles.kpiValue,
                report.net_balance_cents >= 0 ? styles.positive : styles.negative,
              ],
            },
            formatEur(report.net_balance_cents),
          ),
        ),
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(Text, { style: styles.kpiLabel }, "TASA DE AHORRO"),
          React.createElement(
            Text,
            { style: [styles.kpiValue, styles.neutral] },
            report.savings_rate_percent !== null ? `${report.savings_rate_percent}%` : "—",
          ),
          React.createElement(
            Text,
            { style: [styles.kpiDelta, deltaStyle(report.comparison.savings_rate_delta)] },
            deltaText(report.comparison.savings_rate_delta),
          ),
        ),
      ),

      // Top expenses
      React.createElement(Text, { style: styles.sectionTitle }, "Top gastos del mes"),
      React.createElement(
        View,
        { style: styles.rowHeader },
        React.createElement(Text, { style: [styles.col1, styles.headerText] }, "Descripción"),
        React.createElement(Text, { style: [styles.col2, styles.headerText] }, "Categoría"),
        React.createElement(Text, { style: [styles.col3, styles.headerText] }, "Importe"),
      ),
      ...report.top_expenses.map((tx) =>
        React.createElement(
          View,
          { key: tx.id, style: styles.row },
          React.createElement(Text, { style: styles.col1 }, tx.description),
          React.createElement(Text, { style: styles.col2 }, tx.category_name ?? "—"),
          React.createElement(
            Text,
            { style: [styles.col3, styles.negative] },
            formatEur(tx.amount_cents),
          ),
        ),
      ),

      // Expenses by category
      React.createElement(Text, { style: styles.sectionTitle }, "Gastos por categoría"),
      React.createElement(
        View,
        { style: styles.rowHeader },
        React.createElement(Text, { style: [styles.col1, styles.headerText] }, "Categoría"),
        React.createElement(Text, { style: [styles.col2, styles.headerText] }, "Total"),
        React.createElement(Text, { style: [styles.col3, styles.headerText] }, "% del total"),
      ),
      ...report.expenses_by_category
        .slice(0, 10)
        .map((cat) =>
          React.createElement(
            View,
            { key: cat.category_id ?? "none", style: styles.row },
            React.createElement(Text, { style: styles.col1 }, cat.category_name),
            React.createElement(
              Text,
              { style: [styles.col2, styles.negative] },
              formatEur(cat.amount_cents),
            ),
            React.createElement(
              Text,
              { style: styles.col3 },
              `${cat.percent_of_total.toFixed(1)}%`,
            ),
          ),
        ),

      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, null, "patrimio.app"),
        React.createElement(Text, null, generatedAt),
      ),
    ),
  );
}

// ─────────────────────────────────────────────────────────────
// Fiscal Report PDF
// ─────────────────────────────────────────────────────────────

function FiscalReportDocument({ report }: { report: FiscalReport }) {
  const generatedAt = new Date().toLocaleDateString("es-ES");

  return React.createElement(
    Document,
    { title: `Informe Fiscal IRPF ${report.fiscal_year} — Patrimio` },
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.brandName }, "Patrimio"),
          React.createElement(
            Text,
            { style: styles.brandTagline },
            "Gestión de patrimonio personal",
          ),
        ),
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.reportTitle }, "Resumen Fiscal IRPF"),
          React.createElement(
            Text,
            { style: styles.reportSubtitle },
            `Ejercicio ${report.fiscal_year}`,
          ),
          React.createElement(Text, { style: styles.reportSubtitle }, `Generado el ${generatedAt}`),
        ),
      ),

      // Capital gains summary
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        "Ganancias y pérdidas patrimoniales",
      ),
      React.createElement(
        View,
        { style: styles.kpiGrid },
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(Text, { style: styles.kpiLabel }, "GANANCIAS"),
          React.createElement(
            Text,
            { style: [styles.kpiValue, styles.positive] },
            formatEur(report.capital_gains.total_gains_cents),
          ),
        ),
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(Text, { style: styles.kpiLabel }, "PÉRDIDAS"),
          React.createElement(
            Text,
            { style: [styles.kpiValue, styles.negative] },
            formatEur(report.capital_gains.total_losses_cents),
          ),
        ),
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(Text, { style: styles.kpiLabel }, "RESULTADO NETO"),
          React.createElement(
            Text,
            {
              style: [
                styles.kpiValue,
                report.capital_gains.net_cents >= 0 ? styles.positive : styles.negative,
              ],
            },
            formatEur(report.capital_gains.net_cents),
          ),
        ),
      ),

      // Sale operations table
      ...(report.capital_gains.operations.length > 0
        ? [
            React.createElement(
              View,
              { style: styles.rowHeader },
              React.createElement(Text, { style: [styles.col1, styles.headerText] }, "Activo"),
              React.createElement(Text, { style: [styles.col2, styles.headerText] }, "Fecha venta"),
              React.createElement(
                Text,
                { style: [styles.col2, styles.headerText] },
                "Precio venta",
              ),
              React.createElement(
                Text,
                { style: [styles.col3, styles.headerText] },
                "Ganancia/pérdida",
              ),
            ),
            ...report.capital_gains.operations.map((op, i) =>
              React.createElement(
                View,
                { key: `op-${i}`, style: styles.row },
                React.createElement(
                  Text,
                  { style: styles.col1 },
                  `${op.ticker} — ${op.investment_name}`,
                ),
                React.createElement(Text, { style: styles.col2 }, formatDate(op.operation_date)),
                React.createElement(Text, { style: styles.col2 }, formatEur(op.sell_price_cents)),
                React.createElement(
                  Text,
                  { style: [styles.col3, op.is_gain ? styles.positive : styles.negative] },
                  formatEur(op.gross_gain_cents),
                ),
              ),
            ),
          ]
        : [
            React.createElement(
              Text,
              { key: "no-ops", style: { color: TEXT_MUTED, fontSize: 8, marginTop: 4 } },
              "Sin operaciones de venta en el ejercicio.",
            ),
          ]),

      // Dividends
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        "Rendimientos del capital mobiliario (dividendos)",
      ),
      React.createElement(
        View,
        { style: styles.kpiGrid },
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(Text, { style: styles.kpiLabel }, "BRUTO PERCIBIDO"),
          React.createElement(
            Text,
            { style: [styles.kpiValue, styles.positive] },
            formatEur(report.dividends.gross_total_cents),
          ),
        ),
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(Text, { style: styles.kpiLabel }, "RETENCIÓN (19%)"),
          React.createElement(
            Text,
            { style: [styles.kpiValue, styles.negative] },
            formatEur(report.dividends.withheld_total_cents),
          ),
        ),
        React.createElement(
          View,
          { style: styles.kpiCard },
          React.createElement(Text, { style: styles.kpiLabel }, "NETO RECIBIDO"),
          React.createElement(
            Text,
            { style: [styles.kpiValue, styles.neutral] },
            formatEur(report.dividends.net_total_cents),
          ),
        ),
      ),

      // Disclaimer
      React.createElement(
        View,
        { style: styles.disclaimer },
        React.createElement(Text, null, report.disclaimer),
      ),

      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, null, "patrimio.app"),
        React.createElement(Text, null, generatedAt),
      ),
    ),
  );
}

// ─────────────────────────────────────────────────────────────
// Public render functions
// ─────────────────────────────────────────────────────────────

export async function renderMonthlyReportPdf(report: MonthlyReport): Promise<Buffer> {
  const doc = React.createElement(MonthlyReportDocument, { report });
  return renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
}

export async function renderFiscalReportPdf(report: FiscalReport): Promise<Buffer> {
  const doc = React.createElement(FiscalReportDocument, { report });
  return renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
}
