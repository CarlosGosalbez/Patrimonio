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
const frequencySchema = z.enum(["monthly", "quarterly", "semiannual", "annual"]);
const investmentTypeSchema = z.enum([
  "stock",
  "etf",
  "fund",
  "crypto",
  "deposit",
  "bond",
  "reit",
  "other",
]);
const operationTypeSchema = z.enum(["buy", "sell", "dividend", "split"]);
const optionalMoneyInput = z
  .union([moneyInput, z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value ? value : null));

function thresholdInputSchema(required = false) {
  const base = z
    .union([z.number(), z.string()])
    .transform((value) => {
      if (typeof value === "number") {
        return value;
      }

      const trimmed = value.trim().replace(",", ".");

      if (!trimmed) {
        return null;
      }

      const parsed = Number.parseFloat(trimmed);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .refine(
      (value) =>
        value === null ||
        (typeof value === "number" && Number.isFinite(value) && value >= 0.1 && value <= 50),
      {
        message: "Invalid threshold",
      },
    );

  return required ? base.refine((value) => value !== null) : base.optional().default(null);
}

export const investmentPositionInputSchema = z
  .object({
    account_id: uuid.optional().nullable().default(null),
    annual_dividend_per_share_input: moneyInput.optional().default("0"),
    currency: isoCurrency.optional().default("EUR"),
    daily_price_alert_threshold_percent: thresholdInputSchema(false),
    dividend_frequency: frequencySchema.optional().default("annual"),
    investment_type: investmentTypeSchema,
    market: optionalNullableString(safeString(50)),
    name: safeName(200).min(1),
    next_dividend_date: z
      .union([dateString, z.literal(""), z.null(), z.undefined()])
      .transform((value) => (value ? value : null)),
    notes: optionalNullableString(safeString(2000)),
    opening_date: dateString,
    opening_price_input: moneyInput,
    opening_quantity_input: z.string().trim().min(1),
    sector: optionalNullableString(safeName(120)),
    ticker: safeString(20)
      .min(1)
      .transform((value) => value.toUpperCase()),
  })
  .strict();

export const investmentPositionPatchSchema = z
  .object({
    account_id: uuid.optional(),
    annual_dividend_per_share_input: moneyInput.optional(),
    currency: isoCurrency.optional(),
    daily_price_alert_threshold_percent: thresholdInputSchema(false).optional(),
    dividend_frequency: frequencySchema.optional(),
    investment_type: investmentTypeSchema.optional(),
    market: optionalNullableString(safeString(50)).optional(),
    name: safeName(200).min(1).optional(),
    next_dividend_date: z
      .union([dateString, z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((value) => (value ? value : null)),
    notes: optionalNullableString(safeString(2000)).optional(),
    sector: optionalNullableString(safeName(120)).optional(),
    ticker: safeString(20)
      .min(1)
      .transform((value) => value.toUpperCase())
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

export const investmentOperationInputSchema = z
  .object({
    fee_input: optionalMoneyInput,
    notes: optionalNullableString(safeString(1000)),
    operation_date: dateString,
    operation_type: operationTypeSchema,
    price_input: optionalMoneyInput,
    quantity_input: z.string().trim().min(1),
    withholding_input: optionalMoneyInput,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.operation_type === "split") {
      if (value.price_input) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Price is not allowed for splits",
          path: ["price_input"],
        });
      }

      if (value.fee_input) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fee is not allowed for splits",
          path: ["fee_input"],
        });
      }

      if (value.withholding_input) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Withholding is not allowed for splits",
          path: ["withholding_input"],
        });
      }

      return;
    }

    if (!value.price_input) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Price is required",
        path: ["price_input"],
      });
    }

    if (value.operation_type !== "dividend" && value.withholding_input) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Withholding is only allowed for dividends",
        path: ["withholding_input"],
      });
    }
  });

export const investmentSearchSchema = z
  .object({
    q: safeString(60).min(1),
    limit: z.coerce.number().int().min(1).max(10).optional().default(6),
  })
  .strict();

export const investmentExportSchema = z
  .object({
    year: z.coerce.number().int().min(2020).max(2100).optional().default(new Date().getFullYear()),
  })
  .strict();

export const tickerSearchQuerySchema = investmentSearchSchema;
export const yearQuerySchema = z.coerce.number().int().min(2020).max(2100);
export const investmentOperationCreateSchema = investmentOperationInputSchema;
