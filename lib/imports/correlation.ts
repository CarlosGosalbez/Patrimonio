/**
 * lib/imports/correlation.ts
 * Engine for matching imported transactions to existing recurring commitments.
 */

export interface CorrelationRule {
  id: string;
  commitment_id: string | null;
  match_type: "exact_amount" | "amount_range" | "concept_contains" | "concept_regex";
  match_value: string;
  match_tolerance_cents: number | null;
  auto_apply: boolean;
  is_active: boolean;
}

export interface CorrelationTarget {
  id: string;
  name: string;
  amount_cents: number;
}

export interface TransactionRow {
  amount_cents: number;
  description: string;
}

/**
 * Checks whether a transaction row matches a correlation rule.
 */
export function matchesRule(row: TransactionRow, rule: CorrelationRule): boolean {
  switch (rule.match_type) {
    case "exact_amount": {
      const target = parseInt(rule.match_value, 10);
      return Math.abs(row.amount_cents) === target;
    }
    case "amount_range": {
      const target = parseInt(rule.match_value, 10);
      const tolerance = rule.match_tolerance_cents ?? 0;
      return Math.abs(Math.abs(row.amount_cents) - target) <= tolerance;
    }
    case "concept_contains": {
      return row.description.toLowerCase().includes(rule.match_value.toLowerCase());
    }
    case "concept_regex": {
      try {
        return new RegExp(rule.match_value, "i").test(row.description);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

/**
 * Finds the first matching rule for a transaction from a list of active rules.
 * Returns null if no rule matches.
 */
export function findMatchingRule(
  row: TransactionRow,
  rules: CorrelationRule[],
): CorrelationRule | null {
  return rules.find((rule) => rule.is_active && matchesRule(row, rule)) ?? null;
}

/**
 * Detects potentially recurring transactions from a flat list of rows.
 * Groups by similar amount + description; flags groups appearing ≥ 2 times.
 */
export function detectRecurringGroups(
  rows: TransactionRow[],
): Array<{ amount_cents: number; description: string; count: number }> {
  const groups = new Map<string, { amount_cents: number; description: string; count: number }>();

  for (const row of rows) {
    // Normalise description: lowercase, strip special chars
    const normDesc = row.description
      .toLowerCase()
      .replace(/[^a-záéíóúüñ0-9\s]/gi, "")
      .trim()
      .slice(0, 60);
    const absAmount = Math.abs(row.amount_cents);
    // Key: bucket amount to ±200 cents (2€) + first 40 chars of description
    const amountBucket = Math.round(absAmount / 200) * 200;
    const key = `${amountBucket}|${normDesc.slice(0, 40)}`;

    const existing = groups.get(key);
    if (existing) {
      existing.count++;
    } else {
      groups.set(key, { amount_cents: absAmount, description: row.description, count: 1 });
    }
  }

  return Array.from(groups.values()).filter((g) => g.count >= 2);
}
