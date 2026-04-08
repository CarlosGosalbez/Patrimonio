import { z } from "zod";
import {
  dateString,
  moneyInput,
  optionalNullableString,
  safeName,
  safeString,
} from "@/lib/validation/safe-zod";

const uuid = z.string().uuid();
const isoCurrency = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());
const integerLike = z.coerce.number().int().min(0);

export const alertRecurrenceSchema = z.enum([
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "biennial",
  "once",
]);

export const customAlertInputSchema = z
  .object({
    advance_notice_days: integerLike.optional().default(30),
    auto_deactivate: z.boolean().optional().default(true),
    category_id: z.union([uuid, z.null()]).optional().default(null),
    currency: isoCurrency.optional().default("EUR"),
    description: optionalNullableString(safeString(1000)),
    dismissed_until: z
      .union([dateString, z.literal(""), z.null(), z.undefined()])
      .transform((value) => {
        if (!value) {
          return null;
        }

        return value;
      }),
    due_date: dateString,
    expected_amount_input: z
      .union([moneyInput, z.literal(""), z.null(), z.undefined()])
      .transform((value) => (value ? value : null)),
    is_active: z.boolean().optional().default(true),
    name: safeName(200).min(1),
    recurrence: alertRecurrenceSchema,
  })
  .strict();

const _customAlertPatchFieldsSchema = z
  .object({
    advance_notice_days: integerLike.optional(),
    auto_deactivate: z.boolean().optional(),
    category_id: z.union([uuid, z.null()]).optional(),
    currency: isoCurrency.optional(),
    description: optionalNullableString(safeString(1000)).optional(),
    dismissed_until: z
      .union([dateString, z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((value) => {
        if (value === undefined || value === "" || value === null) {
          return null;
        }

        return value;
      }),
    due_date: dateString.optional(),
    expected_amount_input: z
      .union([moneyInput, z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((value) => {
        if (value === undefined || value === "" || value === null) {
          return null;
        }

        return value;
      }),
    is_active: z.boolean().optional(),
    name: safeName(200).min(1).optional(),
    recurrence: alertRecurrenceSchema.optional(),
  })
  .strict();

// .pipe() ensures the "at least one field" check runs on the RAW input
// (before field-level transforms that convert undefined→null would inflate key counts)
export const customAlertPatchSchema = z
  .record(z.string(), z.unknown())
  .superRefine((raw, ctx) => {
    if (Object.keys(raw).length === 0) {
      ctx.addIssue({ code: "custom", message: "At least one field is required" });
    }
  })
  .pipe(_customAlertPatchFieldsSchema);

export const alertPreferencesSchema = z
  .object({
    weekly_alert_digest_enabled: z.boolean(),
  })
  .strict();
