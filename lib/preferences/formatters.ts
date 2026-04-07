import type { UserPreferences, SupportedCurrency, DateFormat } from "./types";
import { CURRENCY_INFO } from "./types";

/**
 * Format a monetary amount (in cents) according to user preferences
 * @param amountCents - Amount in cents (e.g., 85075 for €850.75)
 * @param preferences - User preferences for currency and decimal places
 * @returns Formatted currency string
 */
export function formatCurrencyWithPreferences(
  amountCents: number,
  preferences: Pick<UserPreferences, "base_currency" | "decimal_places">,
): string {
  const { base_currency, decimal_places } = preferences;
  const amount = amountCents / 100;
  const currencyInfo = CURRENCY_INFO[base_currency];

  const formatter = new Intl.NumberFormat(currencyInfo.locale, {
    style: "currency",
    currency: base_currency,
    minimumFractionDigits: decimal_places,
    maximumFractionDigits: decimal_places,
  });

  return formatter.format(amount);
}

/**
 * Format a date according to user preferences
 * @param date - Date to format
 * @param format - Date format preference
 * @returns Formatted date string
 */
export function formatDateWithPreferences(date: Date | string, format: DateFormat): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  switch (format) {
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Format a number with user's preferred decimal places
 * @param value - Number to format
 * @param decimalPlaces - Number of decimal places (0-4)
 * @returns Formatted number string
 */
export function formatNumberWithPreferences(
  value: number,
  decimalPlaces: number,
  locale: string = "es-ES",
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value);
}
