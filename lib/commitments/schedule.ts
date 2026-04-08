import type { Database } from "@/types/database";

type Frequency = Database["public"]["Enums"]["frequency_type"];
type CommitmentFrequency = Frequency;

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: string | Date) {
  return value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toDateString(value: Date) {
  return toIsoDate(value);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function addFrequency(date: string | Date, frequency: Frequency) {
  const base = toDate(date);

  switch (frequency) {
    case "daily":
      return toIsoDate(new Date(base.getTime() + DAY_MS));
    case "weekly":
      return toIsoDate(new Date(base.getTime() + 7 * DAY_MS));
    case "biweekly":
      return toIsoDate(new Date(base.getTime() + 14 * DAY_MS));
    case "monthly":
      return toIsoDate(addMonths(base, 1));
    case "bimonthly":
      return toIsoDate(addMonths(base, 2));
    case "quarterly":
      return toIsoDate(addMonths(base, 3));
    case "semiannual":
      return toIsoDate(addMonths(base, 6));
    case "annual":
      return toIsoDate(addMonths(base, 12));
  }
}

export function monthStart(date: string | Date) {
  const base = toDate(date);
  return new Date(base.getFullYear(), base.getMonth(), 1);
}

export function monthEnd(date: string | Date) {
  const base = toDate(date);
  return new Date(base.getFullYear(), base.getMonth() + 1, 0);
}

export function buildMonthSeries(count: number, start: string | Date = new Date()) {
  const items: string[] = [];
  const base = monthStart(start);

  for (let index = 0; index < count; index += 1) {
    items.push(toIsoDate(addMonths(base, index)));
  }

  return items;
}

export function getCommitmentStatus(
  commitment: {
    cancelled_at: string | null;
    end_date: string | null;
    is_active: boolean;
  },
  today: string | Date = new Date(),
) {
  const current = toDate(today);

  if (commitment.cancelled_at) {
    return "expired" as const;
  }

  if (commitment.end_date && toDate(commitment.end_date) < current) {
    return "expired" as const;
  }

  if (!commitment.is_active) {
    return "paused" as const;
  }

  return "active" as const;
}

export function getSubscriptionStatus(
  commitment: {
    cancelled_at: string | null;
  },
  hasUnexpectedCharge: boolean,
) {
  if (hasUnexpectedCharge) {
    return "unexpected_charge" as const;
  }

  if (commitment.cancelled_at) {
    return "cancelled" as const;
  }

  return "active" as const;
}

export function collectOccurrencesInRange(
  commitment: {
    end_date: string | null;
    frequency: Frequency;
    next_due_date: string;
  },
  rangeStart: string | Date,
  rangeEnd: string | Date,
  maxOccurrences = 512,
) {
  const start = toDate(rangeStart);
  const end = toDate(rangeEnd);
  const items: string[] = [];
  const limitDate = commitment.end_date ? toDate(commitment.end_date) : null;
  let cursor = commitment.next_due_date;
  let guard = 0;

  while (guard < maxOccurrences) {
    const current = toDate(cursor);

    if (limitDate && current > limitDate) {
      break;
    }

    if (current > end) {
      break;
    }

    if (current >= start) {
      items.push(cursor);
    }

    cursor = addFrequency(cursor, commitment.frequency);
    guard += 1;
  }

  return items;
}

export function occursInMonth(
  commitment: {
    end_date: string | null;
    frequency: Frequency;
    next_due_date: string;
  },
  month: string | Date,
) {
  const occurrences = collectOccurrencesInRange(
    commitment,
    monthStart(month),
    monthEnd(month),
    128,
  );
  return occurrences.length > 0;
}

export function countMonthsUntil(date: string | Date, today: string | Date = new Date()) {
  const target = monthStart(date);
  const current = monthStart(today);
  return (
    (target.getFullYear() - current.getFullYear()) * 12 + (target.getMonth() - current.getMonth())
  );
}

export function normalizeDueDate(
  dateValue: string,
  frequency: CommitmentFrequency,
  today: string | Date = new Date(),
  maxIterations = 512,
) {
  let cursor = dateValue;
  let guard = 0;

  while (cursor < toDateString(toDate(today)) && guard < maxIterations) {
    const next = addFrequency(cursor, frequency);

    if (next === cursor) {
      break;
    }

    cursor = next;
    guard += 1;
  }

  return cursor;
}
