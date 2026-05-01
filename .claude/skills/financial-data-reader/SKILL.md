---
name: financial-data-reader
description: "Read and format financial data from Supabase for AI agents in Patrimio. Use when an agent needs monthly transactions, spending by category, net worth, cash flow projections, or budget status from the database."
argument-hint: "What financial data do you need to read? (e.g., 'monthly summary for November', 'category spending last 6 months')"
---

# Financial Data Reader

Shared skill for all Patrimio AI agents to read financial data from Supabase.

## Functions

### `getMonthlyTransactions(userId, month, year)`

```typescript
// lib/ai/skills/financial-data-reader.ts
import { createServerClient } from "@/lib/supabase/server";

export async function getMonthlyTransactions(
  userId: string,
  month: number, // 1-12
  year: number,
): Promise<TransactionSummary> {
  const supabase = createServerClient();
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const { data } = await supabase
    .from("transactions")
    .select(
      `
      id, type, amount_cents, currency, description,
      transaction_date, category:categories(id, name, type)
    `,
    )
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("transaction_date", startDate)
    .lte("transaction_date", endDate)
    .order("transaction_date", { ascending: false });

  return formatMonthlyTransactions(data ?? []);
}
```

### `getCategorySpending(userId, dateRange, topN?)`

Returns spending aggregated by category for the given date range.

```typescript
export async function getCategorySpending(
  userId: string,
  dateRange: { from: string; to: string },
  topN = 10,
): Promise<CategorySpending[]>;
```

### `getNetWorth(userId)`

Uses the `get_net_worth` stored procedure:

```typescript
export async function getNetWorth(userId: string): Promise<NetWorthSummary> {
  const { data } = await supabase.rpc("get_net_worth", { p_user_id: userId });
  return data[0];
}
```

### `getRecurringCommitmentsProjection(userId, months)`

Projects recurring income/expenses for the next N months:

```typescript
export async function getRecurringCommitmentsProjection(
  userId: string,
  months: number, // 1-24
): Promise<CashFlowProjection[]>;
```

## Data Formatting for Agent Context

Always convert cents to formatted strings for Claude context:

```typescript
// Include in agent context:
{
  "month": "Noviembre 2025",
  "income": "3.200,00 €",
  "expenses": "2.450,75 €",
  "balance": "749,25 €",
  "savings_rate": "23,4%",
  "top_categories": [
    { "name": "Vivienda", "amount": "850,00 €", "percent": "34,7%" },
    { "name": "Alimentación", "amount": "380,00 €", "percent": "15,5%" }
  ]
}
```

## Security

- The `userId` parameter is ALWAYS sourced from `supabase.auth.getUser()` in the calling agent
- Never pass `userId` from request body to these functions
- All queries include `.eq('user_id', userId)` — RLS is a secondary check
