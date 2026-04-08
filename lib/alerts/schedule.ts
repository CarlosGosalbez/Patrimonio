import type { Database } from "@/types/database";

type Recurrence = Database["public"]["Enums"]["alert_recurrence_type"];

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: string | Date) {
  return value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function addAlertRecurrence(date: string | Date, recurrence: Recurrence) {
  const base = toDate(date);

  switch (recurrence) {
    case "monthly":
      return toIsoDate(addMonths(base, 1));
    case "quarterly":
      return toIsoDate(addMonths(base, 3));
    case "semiannual":
      return toIsoDate(addMonths(base, 6));
    case "annual":
      return toIsoDate(addMonths(base, 12));
    case "biennial":
      return toIsoDate(addMonths(base, 24));
    case "once":
      return toIsoDate(base);
  }
}

export function getNextAlertDueDate(
  alert: {
    due_date: string;
    recurrence: Recurrence;
  },
  today: string | Date = new Date(),
) {
  if (alert.recurrence === "once") {
    return alert.due_date;
  }

  const current = toDate(today);
  let cursor = alert.due_date;
  let guard = 0;

  while (guard < 120) {
    if (toDate(cursor) >= current) {
      return cursor;
    }

    cursor = addAlertRecurrence(cursor, alert.recurrence);
    guard += 1;
  }

  return cursor;
}

export function isAlertSnoozed(
  alert: {
    dismissed_until: string | null;
  },
  dueDate: string,
) {
  if (!alert.dismissed_until) {
    return false;
  }

  return toDate(alert.dismissed_until) >= toDate(dueDate);
}

export function daysUntil(date: string | Date, today: string | Date = new Date()) {
  return Math.ceil((toDate(date).getTime() - toDate(today).getTime()) / DAY_MS);
}

export function getAlertUrgency(days: number) {
  if (days <= 7) {
    return "critical" as const;
  }

  if (days <= 21) {
    return "warning" as const;
  }

  return "info" as const;
}
