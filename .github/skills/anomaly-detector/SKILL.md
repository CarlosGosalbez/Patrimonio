---
name: anomaly-detector
description: "Detect unusual spending patterns, potential duplicate transactions, and financial outliers in Patrimio data. Use when building alert systems, implementing the Financial Insights agent's anomaly detection, or identifying suspicious transaction patterns."
---

# Anomaly Detector

Statistical pattern detection for financial data in Patrimio.
Used primarily by the Financial Insights agent and budget alert system.

## Spending Anomaly Detection

A category spend is anomalous when it exceeds 2 standard deviations from the user's historical mean:

```typescript
// lib/ai/skills/anomaly-detector.ts
interface CategoryAnomaly {
  categoryId: string;
  categoryName: string;
  currentMonthCents: number;
  historicalMeanCents: number;
  historicalStdDevCents: number;
  zScore: number; // How many std devs above mean
  severity: "warning" | "alert"; // warning > 1.5σ, alert > 2σ
  percentageAboveMean: number;
}

export async function detectSpendingAnomalies(
  userId: string,
  currentMonth: { year: number; month: number },
  lookbackMonths = 6,
): Promise<CategoryAnomaly[]> {
  // 1. Get current month spending by category
  // 2. Get historical spending for same categories (lookbackMonths)
  // 3. Calculate mean and std dev per category
  // 4. Flag categories where z-score > 1.5
  // Returns sorted by z-score descending
}
```

## Duplicate Transaction Detection

Identity: same `account_id` + same `amount_cents` + same date within ±2 days + similar description.

```typescript
interface DuplicateCandidate {
  newTransaction: TransactionInput;
  existingTransaction: Transaction;
  confidence: number; // 0-1
  reason: "exact" | "fuzzy_amount" | "fuzzy_date" | "fuzzy_description";
}

export function detectPotentialDuplicates(
  newTransactions: TransactionInput[],
  existingTransactions: Transaction[],
): DuplicateCandidate[];

// String similarity for description matching
function descriptionSimilarity(a: string, b: string): number {
  // Uses Levenshtein distance normalized to 0-1
  // Returns 1.0 for identical, 0.0 for completely different
  // Threshold for "similar": > 0.75
}
```

## Income Irregularity Detection

Flags when a recurring income (salary, rent) is not received as expected:

```typescript
interface IncomeIrregularity {
  commitmentId: string;
  description: string;
  expectedDate: Date;
  expectedAmountCents: number;
  issueType: "missing" | "amount_variance" | "late";
  daysLate?: number;
  amountVarianceCents?: number;
}

export async function detectIncomeIrregularities(
  userId: string,
  month: number,
  year: number,
): Promise<IncomeIrregularity[]>;
```

## Budget Threshold Alerts

```typescript
interface BudgetAlert {
  budgetId: string;
  categoryName: string;
  percentUsed: number;
  remainingCents: number;
  projectedOverrunCents: number; // Based on current month pace
  alertLevel: "approaching" | "at_limit" | "exceeded";
  daysRemainingInMonth: number;
}

export async function detectBudgetAlerts(userId: string): Promise<BudgetAlert[]>;
// Returns alerts sorted by severity, only for active budgets
```
