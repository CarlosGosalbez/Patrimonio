import { z } from 'zod'
import { dateString, moneyInput } from '@/lib/validation/safe-zod'

const uuid = z.string().uuid()
const isoCurrency = z.string().trim().length(3).transform((value) => value.toUpperCase())

export const budgetPeriodSchema = z.enum(['monthly', 'annual'])

export const budgetInputSchema = z
  .object({
    alert_threshold: z.coerce.number().int().min(1).max(100).optional().default(80),
    category_id: uuid,
    currency: isoCurrency.optional().default('EUR'),
    end_date: z.union([dateString, z.literal(''), z.null(), z.undefined()]).transform((value) => {
      if (!value) {
        return null
      }

      return value
    }),
    is_active: z.boolean().optional().default(true),
    limit_input: moneyInput,
    period: budgetPeriodSchema,
    start_date: dateString,
  })
  .strict()

export const budgetPatchSchema = z
  .object({
    alert_threshold: z.coerce.number().int().min(1).max(100).optional(),
    category_id: uuid.optional(),
    currency: isoCurrency.optional(),
    end_date: z.union([dateString, z.literal(''), z.null(), z.undefined()]).optional().transform((value) => {
      if (value === undefined || value === '' || value === null) {
        return null
      }

      return value
    }),
    is_active: z.boolean().optional(),
    limit_input: moneyInput.optional(),
    period: budgetPeriodSchema.optional(),
    start_date: dateString.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
