---
name: anomaly-detector
description: "Detect unusual spending patterns, duplicate transactions, and financial outliers in Patrimio. Use when building alert systems, implementing Financial Insights agent's anomaly detection, or flagging suspicious import data."
user-invocable: false
paths:
  - "lib/ai/**"
  - "app/api/ai/insights/**"
---

# Anomaly Detector

Statistical detection of financial anomalies for Patrimio.

## Spending Anomaly (z-score vs historical mean)

A category spend is anomalous when it exceeds **1.5σ** from the user's 6-month mean.

```typescript
// lib/ai/skills/anomaly-detector.ts
interface CategoryAnomaly {
  categoryId: string;
  categoryName: string;
  currentMonthCents: number;
  historicalMeanCents: number;
  historicalStdDevCents: number;
  zScore: number;
  severity: "warning" | "alert"; // warning ≥ 1.5σ, alert ≥ 2σ
  percentAboveMean: number;
}

export async function detectSpendingAnomalies(
  userId: string,
  currentMonth: { year: number; month: number },
  lookbackMonths = 6,
): Promise<CategoryAnomaly[]> {
  // 1. Get current month totals by category (WHERE deleted_at IS NULL)
  // 2. Get past N months totals for same categories
  // 3. Calculate mean + stdDev per category
  // 4. Filter: zScore = (current - mean) / stdDev > 1.5
  // 5. Sort by zScore DESC
}
```

## Duplicate Transaction Detection

**Identity criteria:** same `account_id` + same `amount_cents` + date within ±2 days + description similarity ≥ 0.75.

```typescript
interface DuplicateCandidate {
  newTransaction: TransactionInput;
  existingTransaction: Transaction;
  confidence: number; // 0-1
  reason: "exact" | "fuzzy_amount" | "fuzzy_date" | "fuzzy_description";
}

// String similarity: Levenshtein distance normalized 0-1
function descriptionSimilarity(a: string, b: string): number;

export function detectPotentialDuplicates(
  newTransactions: TransactionInput[],
  existingTransactions: Transaction[],
): DuplicateCandidate[];
```

Confidence thresholds:

- `≥ 0.90` → Block import, require user confirmation
- `0.70–0.89` → Yellow warning, allow with confirmation
- `< 0.70` → Log only, no UI disruption

## AI Agent Output Format

When reporting anomalies in Financial Insights, format as:

```
⚠️ Gasto inusual en Restaurantes: 234,50 € (media: 87,20 €, +169%)
⚠️ Gasto inusual en Suscripciones: 125,00 € (media: 45,80 €, +173%)
```

Always include:

1. Category name (Spanish)
2. Current amount (formatted with `formatCurrency`)
3. Historical mean (es-ES)
4. Percentage above mean

## Budget Alert Thresholds

| Usage  | Status        | Action                        |
| ------ | ------------- | ----------------------------- |
| ≥ 100% | `exceeded`    | Push notification + red in UI |
| ≥ 85%  | `warning`     | Yellow badge                  |
| ≥ 70%  | `approaching` | Subtle indicator              |
| < 70%  | `ok`          | No indicator                  |
