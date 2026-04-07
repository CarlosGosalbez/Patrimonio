import { describe, it, expect } from "vitest";
import {
  PreferencesSchema,
  DEFAULT_PREFERENCES,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  DATE_FORMATS,
  THEMES,
} from "@/lib/preferences/types";

describe("PreferencesSchema", () => {
  it("should accept valid preferences", () => {
    const validInput = {
      base_currency: "USD",
      locale: "en",
      date_format: "MM/DD/YYYY",
      decimal_places: 2,
      first_day_week: 0,
      theme: "dark",
    };

    const result = PreferencesSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validInput);
    }
  });

  it("should accept default preferences", () => {
    const result = PreferencesSchema.safeParse(DEFAULT_PREFERENCES);
    expect(result.success).toBe(true);
  });

  it("should reject invalid currency", () => {
    const invalidInput = {
      ...DEFAULT_PREFERENCES,
      base_currency: "ABC", // Invalid currency
    };

    const result = PreferencesSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject invalid locale", () => {
    const invalidInput = {
      ...DEFAULT_PREFERENCES,
      locale: "fr", // Not supported
    };

    const result = PreferencesSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject invalid date format", () => {
    const invalidInput = {
      ...DEFAULT_PREFERENCES,
      date_format: "MM-DD-YYYY", // Not in enum
    };

    const result = PreferencesSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject decimal_places out of range", () => {
    const invalidInput = {
      ...DEFAULT_PREFERENCES,
      decimal_places: 5, // Max is 4
    };

    const result = PreferencesSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject negative decimal_places", () => {
    const invalidInput = {
      ...DEFAULT_PREFERENCES,
      decimal_places: -1,
    };

    const result = PreferencesSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject invalid first_day_week", () => {
    const invalidInput = {
      ...DEFAULT_PREFERENCES,
      first_day_week: 2, // Only 0 or 1 allowed
    };

    const result = PreferencesSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject invalid theme", () => {
    const invalidInput = {
      ...DEFAULT_PREFERENCES,
      theme: "neon", // Not in enum
    };

    const result = PreferencesSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should reject extra fields due to strict mode", () => {
    const invalidInput = {
      ...DEFAULT_PREFERENCES,
      extraField: "should fail",
    };

    const result = PreferencesSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it("should have all supported currencies in enum", () => {
    expect(SUPPORTED_CURRENCIES).toHaveLength(13);
    expect(SUPPORTED_CURRENCIES).toContain("EUR");
    expect(SUPPORTED_CURRENCIES).toContain("USD");
    expect(SUPPORTED_CURRENCIES).toContain("GBP");
  });

  it("should have all supported locales in enum", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(2);
    expect(SUPPORTED_LOCALES).toContain("es");
    expect(SUPPORTED_LOCALES).toContain("en");
  });

  it("should have all date formats in enum", () => {
    expect(DATE_FORMATS).toHaveLength(3);
    expect(DATE_FORMATS).toContain("DD/MM/YYYY");
    expect(DATE_FORMATS).toContain("MM/DD/YYYY");
    expect(DATE_FORMATS).toContain("YYYY-MM-DD");
  });

  it("should have all themes in enum", () => {
    expect(THEMES).toHaveLength(3);
    expect(THEMES).toContain("auto");
    expect(THEMES).toContain("light");
    expect(THEMES).toContain("dark");
  });
});
