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
const optionalRateInput = z
  .union([z.string().trim(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (!value) {
      return null;
    }

    if (!/^\d{1,3}([.,]\d{1,3})?$/.test(value)) {
      ctx.addIssue({ code: "custom", message: "Invalid interest rate" });
      return z.NEVER;
    }

    return Number.parseFloat(value.replace(",", "."));
  });

export const commitmentTypeSchema = z.enum([
  "mortgage",
  "rent_income",
  "rent_expense",
  "subscription",
  "tax",
  "insurance",
  "utility",
  "other",
]);

export const commitmentFrequencySchema = z.enum([
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "annual",
]);

export const commitmentInputSchema = z
  .object({
    account_id: uuid,
    advance_notice_days: integerLike.optional().default(7),
    allows_early_repayment: z.boolean().optional().default(false),
    amount_input: moneyInput,
    cancelled_at: z
      .union([dateString, z.literal(""), z.null(), z.undefined()])
      .transform((value) => {
        if (!value) {
          return null;
        }

        return value;
      }),
    category_id: z.union([uuid, z.null()]).optional().default(null),
    commitment_type: commitmentTypeSchema,
    currency: isoCurrency.optional().default("EUR"),
    description: optionalNullableString(safeString(2000)),
    end_date: z.union([dateString, z.literal(""), z.null(), z.undefined()]).transform((value) => {
      if (!value) {
        return null;
      }

      return value;
    }),
    frequency: commitmentFrequencySchema,
    interest_rate_input: optionalRateInput,
    is_active: z.boolean().optional().default(true),
    is_automated: z.boolean().optional().default(true),
    is_income: z.boolean(),
    is_variable_rate: z.boolean().optional().default(false),
    maturity_year: z
      .union([z.coerce.number().int().min(2000).max(2200), z.null(), z.undefined()])
      .transform((value) => value ?? null),
    name: z.string().trim().min(1).max(200),
    next_due_date: dateString,
    service_name: optionalNullableString(safeString(200)),
    start_date: dateString,
    tolerance_days: integerLike.optional().default(3),
  })
  .strict();

export const commitmentPatchSchema = z
  .object({
    account_id: uuid.optional(),
    advance_notice_days: integerLike.optional(),
    allows_early_repayment: z.boolean().optional(),
    amount_input: moneyInput.optional(),
    cancelled_at: z
      .union([dateString, z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((value) => {
        if (value === undefined || value === "" || value === null) {
          return null;
        }

        return value;
      }),
    category_id: z.union([uuid, z.null()]).optional(),
    commitment_type: commitmentTypeSchema.optional(),
    currency: isoCurrency.optional(),
    description: optionalNullableString(safeString(2000)).optional(),
    end_date: z
      .union([dateString, z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((value) => {
        if (value === undefined || value === "" || value === null) {
          return null;
        }

        return value;
      }),
    frequency: commitmentFrequencySchema.optional(),
    interest_rate_input: optionalRateInput.optional(),
    is_active: z.boolean().optional(),
    is_automated: z.boolean().optional(),
    is_income: z.boolean().optional(),
    is_variable_rate: z.boolean().optional(),
    maturity_year: z
      .union([z.coerce.number().int().min(2000).max(2200), z.null(), z.undefined()])
      .optional()
      .transform((value) => value ?? null),
    name: z.string().trim().min(1).max(200).optional(),
    next_due_date: dateString.optional(),
    service_name: optionalNullableString(safeString(200)).optional(),
    start_date: dateString.optional(),
    tolerance_days: integerLike.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });
