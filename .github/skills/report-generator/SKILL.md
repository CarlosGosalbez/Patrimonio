---
name: report-generator
description: "Generate financial reports for Patrimio: monthly summaries, investment performance reports, net worth evolution, and IRPF-relevant fiscal summaries. Use when implementing export features, generating PDF reports, or building the informes module."
---

# Report Generator

Produces structured financial reports for Patrimio's reports module (M7).

## Report Types

### 1. Monthly Summary Report

```typescript
// lib/ai/skills/report-generator.ts
interface MonthlyReport {
  period: { month: number; year: number; label: string }; // "Noviembre 2025"
  income: {
    totalCents: number;
    byCategory: CategoryAmount[];
  };
  expenses: {
    totalCents: number;
    byCategory: CategoryAmount[];
    topSpends: Transaction[]; // Top 5 expenses
  };
  savingsRate: number; // percentage
  netBalanceCents: number;
  comparisonPreviousMonth: {
    incomeDeltaPct: number;
    expensesDeltaPct: number;
    savingsRateDelta: number;
  };
  budgetCompliance: BudgetStatus[];
}

export async function generateMonthlyReport(
  userId: string,
  month: number,
  year: number,
): Promise<MonthlyReport>;
```

### 2. Investment Performance Report

```typescript
interface InvestmentReport {
  generatedAt: Date;
  portfolio: {
    totalValueCents: number;
    totalCostBasisCents: number;
    totalUnrealizedPLCents: number;
    totalUnrealizedPLPct: number;
    dailyChangeCents: number;
    dailyChangePct: number;
  };
  positions: InvestmentPosition[]; // Each with current value, P&L
  operations: InvestmentOperation[]; // All transactions in period
  dividendsReceived: {
    totalCents: number;
    byPosition: DividendSummary[];
  };
  performance: {
    sinceInceptionPct: number;
    ytdPct: number;
    last12MonthsPct: number;
  };
}
```

### 3. Net Worth Evolution

```typescript
interface NetWorthReport {
  snapshots: Array<{
    date: Date;
    liquidAssetsCents: number;
    investmentValueCents: number;
    totalDebtsCents: number;
    netWorthCents: number;
  }>;
  currentNetWorthCents: number;
  change1YearCents: number;
  change1YearPct: number;
}
```

### 4. IRPF Fiscal Summary (Informe Fiscal)

```typescript
interface FiscalReport {
  fiscalYear: number;
  capitalGains: {
    // Ganancias/pérdidas patrimoniales
    totalGainsCents: number;
    totalLossesCents: number;
    netCents: number;
    operations: SaleOperation[]; // Each sell with cost basis and gain/loss
  };
  dividendsReceived: {
    // Rendimientos del capital mobiliario
    totalCents: number;
    byPayer: DividendByPayer[];
  };
  rentalIncome: {
    // Rendimientos del capital inmobiliario (si aplica)
    totalCents: number;
  };
  note: string; // ALWAYS: "Este informe es orientativo. Consulta con un asesor fiscal."
}
```

## Export Formats

### PDF (via server-side rendering)

```typescript
export async function exportReportToPDF(
  report: MonthlyReport | InvestmentReport,
  locale = "es-ES",
): Promise<Buffer>;
// Uses React → HTML → PDF (via Puppeteer/Playwright in Edge Function)
// Patrimio branding, dark/light mode support
```

### Excel (CSV for simple reports)

```typescript
export function exportTransactionsToCSV(transactions: Transaction[], locale = "es-ES"): string;
// Columns: Fecha, Descripción, Categoría, Cuenta, Importe, Tipo
// Dates in dd/MM/yyyy, amounts with comma decimal separator (es-ES)
```
