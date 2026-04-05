/**
 * Financial formatting utilities for Patrimio
 * All monetary amounts are stored as integer cents in the database
 */

const ES_LOCALE = 'es-ES';

/**
 * Convert cents (integer) to decimal euros
 * @example centsToDec(85075) // 850.75
 */
export function centsToDec(cents: number): number {
  return cents / 100;
}

/**
 * Convert decimal euros to cents (integer)
 * Uses Math.round to avoid floating point errors
 * @example decToCents(850.75) // 85075
 */
export function decToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Format cents as currency string for display
 * @param cents - Amount in cents
 * @param currency - ISO 4217 currency code
 * @param locale - Locale for formatting (default: es-ES)
 * @example formatCurrency(85075, 'EUR') // "850,75 €"
 */
export function formatCurrency(
  cents: number,
  currency: string = 'EUR',
  locale: string = ES_LOCALE
): string {
  const euros = centsToDec(cents);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(euros);
}

/**
 * Format date for display
 * @param date - Date string or Date object
 * @param format - Format type: 'short', 'long', 'full'
 * @example formatDate('2024-03-15') // "15/03/2024"
 */
export function formatDate(
  date: string | Date,
  format: 'short' | 'long' | 'full' = 'short'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  };

  return new Intl.DateTimeFormat(ES_LOCALE, formatOptions[format]).format(dateObj);
}

/**
 * Format percentage for display
 * @param value - Decimal value (0.0575 for 5.75%)
 * @param decimals - Number of decimal places
 * @example formatPercent(0.0575, 2) // "5,75%"
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat(ES_LOCALE, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format large numbers with compact notation
 * @example formatCompact(1500000) // "1,5 M"
 */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat(ES_LOCALE, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
}

/**
 * Parse user input string to cents
 * Handles both comma and dot as decimal separator
 * @example parseInputToCents('850,75') // 85075
 * @example parseInputToCents('850.75') // 85075
 */
export function parseInputToCents(input: string): number {
  const normalized = input.replace(',', '.');
  const euros = parseFloat(normalized);
  if (isNaN(euros)) {
    throw new Error('Invalid number format');
  }
  return decToCents(euros);
}

export function parseCurrencyInput(input: string): number {
  return parseInputToCents(input);
}

export function formatMonth(
  value: string | Date,
  locale: string = ES_LOCALE,
): string {
  const date = typeof value === 'string' ? new Date(`${value.slice(0, 10)}T00:00:00`) : value;

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
  }).format(date);
}
