---
name: report-generator
description: "Generate Patrimio financial reports: monthly summaries, investment performance, net worth evolution, and IRPF fiscal summaries. Use when implementing export features, PDF/Excel reports, or the informes module (M7)."
paths:
  - "lib/reports/**"
  - "app/(app)/informes/**"
---

# Report Generator

Generates structured financial reports for Patrimio's informes module (M7).

## Report Types

| Type                   | Trigger                  | Output                |
| ---------------------- | ------------------------ | --------------------- |
| Monthly summary        | End of month / on demand | PDF + JSON            |
| Investment performance | Quarterly / on demand    | PDF + Excel           |
| Net worth evolution    | On demand (12-month)     | PDF                   |
| IRPF fiscal summary    | Annual (Jan–Dec)         | PDF (hacienda format) |

## Data Queries for Each Report

### Monthly Summary

```typescript
// Required data:
// 1. transactions WHERE month = X AND deleted_at IS NULL (grouped by category)
// 2. budgets for that month + actual spend
// 3. commitments due that month
// 4. vs prior month (percentage changes)

interface MonthlySummaryData {
  month: { year: number; month: number };
  totalIncomeCents: number;
  totalExpenseCents: number;
  netCents: number;
  byCategory: Array<{
    categoryId: string;
    name: string;
    amountCents: number;
    budgetCents?: number;
  }>;
  topMerchants: Array<{ name: string; amountCents: number; count: number }>;
  anomalies: CategoryAnomaly[];
  commitmentsDue: Commitment[];
}
```

### Investment Performance

```typescript
// Required data:
// 1. All positions (investment_positions) at report date
// 2. Market prices from market_cache
// 3. Historical cost basis (purchase_price_cents × quantity)
// 4. Dividends received in period (dividend_records)

interface InvestmentReportData {
  positions: Array<{
    ticker: string;
    name: string;
    quantity: number;
    costBasisCents: number;
    currentValueCents: number;
    unrealizedPnLCents: number;
    unrealizedPnLPct: number;
    dividendsReceivedCents: number;
  }>;
  portfolioTotalCents: number;
  totalUnrealizedPnLCents: number;
  totalDividendsReceivedCents: number;
}
```

## PDF Generation (jsPDF)

```typescript
// lib/reports/pdf-generator.ts
import jsPDF from "jspdf";
import "jspdf-autotable";

export async function generateMonthlyPDF(data: MonthlySummaryData): Promise<Blob> {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  // Page 1: Summary + net worth bar
  // Page 2: Category breakdown table
  // Page 3: Transaction list (if requested)
  return doc.output("blob");
}
```

## Excel Export (xlsx)

```typescript
// lib/reports/excel-generator.ts
import * as XLSX from "xlsx";

export function exportTransactionsToExcel(transactions: Transaction[]): Blob {
  const ws = XLSX.utils.json_to_sheet(
    transactions.map((t) => ({
      Fecha: formatDate(t.transaction_date),
      Descripción: t.description,
      Categoría: t.category_name,
      Importe: formatCurrency(t.amount_cents), // display string
      Cuenta: t.account_name,
    })),
  );
  // Column widths: date=12, description=40, category=20, amount=15
}
```

## IRPF Notes

- Capital gains = `current_value - cost_basis` for sold positions
- Dividends = always taxable (withholding may apply)
- Report must list each operation: ticker, buy date, sell date, gain/loss in euros
- Use `formatCurrency` for all amounts in generated documents
