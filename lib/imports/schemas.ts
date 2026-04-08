import { z } from "zod";
import { dateString, optionalNullableString, safeString } from "@/lib/validation/safe-zod";

const supportedBankSchema = z.enum([
  "santander",
  "bbva",
  "caixabank",
  "ing",
  "sabadell",
  "generic",
]);
const importFileFormatSchema = z.enum(["xlsx", "xls", "csv", "ofx", "qif"]);

const normalizedImportRowSchema = z
  .object({
    amount_cents: z.number().int().positive().max(999_999_999),
    description: safeString(500).min(1, "Description is required"),
    external_id: optionalNullableString(safeString(200)),
    is_income: z.boolean(),
    merchant_key: safeString(120),
    notes: optionalNullableString(safeString(1000)),
    source_row_index: z.number().int().min(0).max(50_000),
    transaction_date: dateString,
    value_date: z.union([dateString, z.null(), z.undefined()]).transform((value) => value ?? null),
  })
  .strict();

export const previewImportSchema = z
  .object({
    account_id: z.string().uuid(),
    file_checksum: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid checksum"),
    file_name: safeString(255).min(1, "File name is required"),
    rows: z.array(normalizedImportRowSchema).min(1).max(3000),
    source_bank: supportedBankSchema,
    source_format: importFileFormatSchema,
  })
  .strict();

export const confirmImportRowSchema = normalizedImportRowSchema
  .extend({
    category_id: z.union([z.string().uuid(), z.null()]),
    should_import: z.boolean().optional(),
  })
  .strict();

export const confirmImportSchema = z
  .object({
    account_id: z.string().uuid(),
    file_checksum: z.string().regex(/^[a-f0-9]{64}$/i, "Invalid checksum"),
    file_name: safeString(255).min(1, "File name is required"),
    rows: z.array(confirmImportRowSchema).min(1).max(3000),
    source_bank: supportedBankSchema,
    source_format: importFileFormatSchema,
  })
  .strict();
