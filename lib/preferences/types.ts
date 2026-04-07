import { z } from "zod";

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "MXN",
  "ARS",
  "COP",
  "CLP",
  "BRL",
  "CAD",
  "AUD",
  "JPY",
  "CNY",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

// Supported locales
export const SUPPORTED_LOCALES = ["es", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// Date formats
export const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

// Themes
export const THEMES = ["auto", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

// Currency metadata
export const CURRENCY_INFO: Record<
  SupportedCurrency,
  { symbol: string; name: string; locale: string }
> = {
  EUR: { symbol: "€", name: "Euro", locale: "es-ES" },
  USD: { symbol: "$", name: "US Dollar", locale: "en-US" },
  GBP: { symbol: "£", name: "British Pound", locale: "en-GB" },
  CHF: { symbol: "CHF", name: "Swiss Franc", locale: "de-CH" },
  MXN: { symbol: "MX$", name: "Mexican Peso", locale: "es-MX" },
  ARS: { symbol: "AR$", name: "Argentine Peso", locale: "es-AR" },
  COP: { symbol: "CO$", name: "Colombian Peso", locale: "es-CO" },
  CLP: { symbol: "CL$", name: "Chilean Peso", locale: "es-CL" },
  BRL: { symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
  CAD: { symbol: "CA$", name: "Canadian Dollar", locale: "en-CA" },
  AUD: { symbol: "AU$", name: "Australian Dollar", locale: "en-AU" },
  JPY: { symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  CNY: { symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
};

// Zod schema for user preferences
export const PreferencesSchema = z
  .object({
    base_currency: z.enum(SUPPORTED_CURRENCIES),
    locale: z.enum(SUPPORTED_LOCALES),
    date_format: z.enum(DATE_FORMATS),
    decimal_places: z.number().int().min(0).max(4),
    first_day_week: z.number().int().min(0).max(1), // 0=Sunday, 1=Monday
    theme: z.enum(THEMES),
  })
  .strict();

export type UserPreferences = z.infer<typeof PreferencesSchema>;

// Default preferences
export const DEFAULT_PREFERENCES: UserPreferences = {
  base_currency: "EUR",
  locale: "es",
  date_format: "DD/MM/YYYY",
  decimal_places: 2,
  first_day_week: 1,
  theme: "auto",
};
