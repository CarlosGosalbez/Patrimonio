import DOMPurify from 'isomorphic-dompurify'
import { z } from 'zod'

function sanitizePlainText(value: string) {
  return DOMPurify.sanitize(value, {
    ALLOWED_ATTR: [],
    ALLOWED_TAGS: [],
  })
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
}

export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')

export const moneyInput = z
  .string()
  .trim()
  .min(1, 'Amount is required')
  .regex(/^\d{1,12}([.,]\d{1,2})?$/, 'Invalid currency format')

export function safeString(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength, `Must be ${maxLength} characters or fewer`)
    .refine((value) => value === sanitizePlainText(value), {
      message: 'Unsafe content is not allowed',
    })
}

export function safeName(maxLength: number) {
  return safeString(maxLength).refine((value) => /[\p{L}\p{N}]/u.test(value), {
    message: 'Name must contain letters or numbers',
  })
}

export function optionalNullableString<T extends z.ZodType<string>>(schema: T) {
  return z.union([schema, z.literal(''), z.null(), z.undefined()]).transform((value) => {
    if (value === undefined || value === null || value === '') {
      return null
    }

    return value
  })
}
