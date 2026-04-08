export type CommitmentFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "semiannual"
  | "annual";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function parseDate(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

export function toDateString(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);

  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();

  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

export function addFrequency(dateValue: string, frequency: CommitmentFrequency) {
  const date = parseDate(dateValue);

  switch (frequency) {
    case "daily":
      return toDateString(addDays(date, 1));
    case "weekly":
      return toDateString(addDays(date, 7));
    case "biweekly":
      return toDateString(addDays(date, 14));
    case "monthly":
      return toDateString(addMonths(date, 1));
    case "bimonthly":
      return toDateString(addMonths(date, 2));
    case "quarterly":
      return toDateString(addMonths(date, 3));
    case "semiannual":
      return toDateString(addMonths(date, 6));
    case "annual":
      return toDateString(addMonths(date, 12));
  }
}

export function getDueDatesUntil(
  startDate: string,
  frequency: CommitmentFrequency,
  limitDate: string,
) {
  const dueDates: string[] = [];
  let cursor = startDate;

  while (cursor <= limitDate) {
    dueDates.push(cursor);
    cursor = addFrequency(cursor, frequency);
  }

  return dueDates;
}

export function addDateDays(dateValue: string, days: number) {
  return toDateString(addDays(parseDate(dateValue), days));
}

export function isMonday(dateValue: string) {
  return parseDate(dateValue).getUTCDay() === 1;
}
