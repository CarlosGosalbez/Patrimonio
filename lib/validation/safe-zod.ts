import { z } from "zod";

/**
 * Sanitize plain text by removing control characters and trimming
 * This is a lightweight alternative to DOMPurify for server-side validation
 * that doesn't require jsdom (which causes ERR_REQUIRE_ESM in Vercel)
 */
function sanitizePlainText(value: string) {
  return (
    value
      // Remove null bytes and control characters (except newlines/tabs if needed)
      .replace(/[\u0000-\u001F\u007F]/g, "")
      // Remove common XSS patterns
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .trim()
  );
}

export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");

export const moneyInput = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .regex(/^\d{1,12}([.,]\d{1,2})?$/, "Invalid currency format");

export function safeString(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength, `Must be ${maxLength} characters or fewer`)
    .refine((value) => value === sanitizePlainText(value), {
      message: "Unsafe content is not allowed",
    });
}

export function safeName(maxLength: number) {
  return safeString(maxLength).refine((value) => /[\p{L}\p{N}]/u.test(value), {
    message: "Name must contain letters or numbers",
  });
}

export function optionalNullableString<T extends z.ZodType<string>>(schema: T) {
  return z.union([schema, z.literal(""), z.null(), z.undefined()]).transform((value) => {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    return value;
  });
}
