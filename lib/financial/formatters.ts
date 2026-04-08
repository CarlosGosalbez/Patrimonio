const ES_LOCALE = "es-ES";
const DATE_SUFFIX = "T00:00:00";

function normalizeDate(value: string | Date) {
  return typeof value === "string" ? new Date(`${value.slice(0, 10)}${DATE_SUFFIX}`) : value;
}

function normalizeCurrencyInput(input: string) {
  const trimmed = input.trim().replace(/\s/g, "");

  if (!trimmed) {
    throw new Error("Invalid number format");
  }

  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  if (decimalIndex === -1) {
    const digits = trimmed.replace(/[.,]/g, "");

    if (!/^\d+$/.test(digits)) {
      throw new Error("Invalid number format");
    }

    return `${digits}.00`;
  }

  const integerPart = trimmed.slice(0, decimalIndex).replace(/[.,]/g, "");
  const decimalPart = trimmed.slice(decimalIndex + 1);

  if (!/^\d+$/.test(integerPart) || !/^\d{1,2}$/.test(decimalPart)) {
    throw new Error("Invalid number format");
  }

  return `${integerPart}.${decimalPart.padEnd(2, "0")}`;
}

export function centsToDec(cents: number): number {
  return cents / 100;
}

export function decToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function formatCurrency(
  cents: number,
  currency: string = "EUR",
  locale: string = ES_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(centsToDec(cents));
}

export function formatCurrencyCompact(
  cents: number,
  currency: string = "EUR",
  locale: string = ES_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(centsToDec(cents));
}

export function formatCents(cents: number, locale: string = ES_LOCALE): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centsToDec(cents));
}

export function formatDate(
  date: string | Date,
  format: "short" | "long" | "full" = "short",
): string {
  const formatOptions: Record<typeof format, Intl.DateTimeFormatOptions> = {
    short: { day: "2-digit", month: "2-digit", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    full: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  };

  return new Intl.DateTimeFormat(ES_LOCALE, formatOptions[format]).format(normalizeDate(date));
}

export function formatDateShort(date: string | Date) {
  return formatDate(date, "short");
}

export function formatPercent(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat(ES_LOCALE, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercentChange(value: number, decimals: number = 1): string {
  const sign = value > 0 ? "+" : "";

  return `${sign}${new Intl.NumberFormat(ES_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}%`;
}

export function formatChangeNarrative(value: number, decimals: number = 1) {
  if (value === 0) {
    return "sin cambios";
  }

  const amount = new Intl.NumberFormat(ES_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  return value > 0 ? `ha aumentado un ${amount}%` : `ha disminuido un ${amount}%`;
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat(ES_LOCALE, {
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}

export function parseInputToCents(input: string): number {
  const normalized = normalizeCurrencyInput(input);
  const euros = Number.parseFloat(normalized);

  if (Number.isNaN(euros)) {
    throw new Error("Invalid number format");
  }

  return decToCents(euros);
}

export function parseCurrencyInput(input: string): number {
  return parseInputToCents(input);
}

export function formatMonth(value: string | Date, locale: string = ES_LOCALE): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
  }).format(normalizeDate(value));
}
