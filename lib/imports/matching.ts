import { countMonthsUntil } from '@/lib/commitments/schedule'
import type { ImportCategorySuggestion, ImportDuplicateCandidate, ImportUnexpectedChargeMatch, NormalizedImportRowInput } from '@/lib/imports/types'
import type { TransactionCategorySummary } from '@/lib/commitments/types'

export interface ExistingTransactionMatch {
  account_id: string
  amount_cents: number
  description: string
  id: string
  transaction_date: string
}

export interface AutoCategorizationRuleMatch {
  category_id: string
  is_case_sensitive: boolean
  is_regex: boolean
  pattern: string
  priority: number
}

export interface CancelledSubscriptionMatch {
  cancelled_at: string
  id: string
  name: string
  service_name: string | null
}

export interface IncomeCommitmentGapCandidate {
  account_id: string
  amount_cents: number
  id: string
  is_income: boolean
  name: string
  next_due_date: string
  status: 'active' | 'paused' | 'expired'
  tolerance_days: number | null
}

const MERCHANT_CATEGORY_HINTS: Array<{
  categoryNames: RegExp[]
  patterns: RegExp[]
}> = [
  {
    categoryNames: [/supermerc/i, /aliment/i],
    patterns: [/mercadona/i, /carrefour/i, /\blidl\b/i, /\baldi\b/i, /eroski/i, /consum/i],
  },
  {
    categoryNames: [/restaurant/i, /ocio/i],
    patterns: [/just ?eat/i, /glovo/i, /deliveroo/i, /uber ?eats/i, /telepizza/i],
  },
  {
    categoryNames: [/suscrip/i],
    patterns: [/netflix/i, /spotify/i, /disney/i, /prime/i, /hbo/i, /apple\.com\/bill/i],
  },
  {
    categoryNames: [/suministr/i, /hogar/i],
    patterns: [/iberdrola/i, /endesa/i, /naturgy/i, /gas natural/i, /canal isabel/i],
  },
  {
    categoryNames: [/tecnolog/i],
    patterns: [/github/i, /aws/i, /adobe/i, /microsoft/i],
  },
  {
    categoryNames: [/impuesto/i],
    patterns: [/aeat/i, /agencia tributaria/i, /seguridad social/i],
  },
  {
    categoryNames: [/salario/i, /otros ingresos/i, /freelance/i],
    patterns: [/nomina/i, /nómina/i],
  },
]

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3)
}

export function descriptionSimilarity(left: string, right: string) {
  const normalizedLeft = normalizeText(left)
  const normalizedRight = normalizeText(right)

  if (!normalizedLeft || !normalizedRight) {
    return 0
  }

  if (normalizedLeft === normalizedRight) {
    return 1
  }

  if (
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    return 0.92
  }

  const leftTokens = new Set(tokenize(normalizedLeft))
  const rightTokens = new Set(tokenize(normalizedRight))

  if (!leftTokens.size || !rightTokens.size) {
    return 0
  }

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length
  return overlap / Math.max(leftTokens.size, rightTokens.size)
}

export function buildImportDedupeKey(accountId: string, row: NormalizedImportRowInput) {
  return `${accountId}:${row.transaction_date}:${row.amount_cents}:${normalizeText(row.description)}`
}

export function detectPossibleDuplicate(
  accountId: string,
  row: NormalizedImportRowInput,
  existingTransactions: ExistingTransactionMatch[],
): ImportDuplicateCandidate | null {
  const matches = existingTransactions
    .filter((transaction) => {
      if (transaction.account_id !== accountId || transaction.amount_cents !== row.amount_cents) {
        return false
      }

      const rowDate = new Date(`${row.transaction_date}T00:00:00`)
      const transactionDate = new Date(`${transaction.transaction_date}T00:00:00`)
      const dayDistance = Math.abs(
        Math.round((transactionDate.getTime() - rowDate.getTime()) / (24 * 60 * 60 * 1000)),
      )

      return dayDistance <= 2
    })
    .map((transaction) => {
      const similarity = descriptionSimilarity(row.description, transaction.description)
      const dayDistance = Math.abs(
        Math.round(
          (new Date(`${transaction.transaction_date}T00:00:00`).getTime() -
            new Date(`${row.transaction_date}T00:00:00`).getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      )

      if (similarity < 0.75) {
        return null
      }

      const confidence =
        similarity >= 0.95 && dayDistance === 0
          ? 0.99
          : Math.max(0.7, Number((similarity - dayDistance * 0.05).toFixed(2)))

      return {
        confidence,
        existing_amount_cents: transaction.amount_cents,
        existing_description: transaction.description,
        existing_id: transaction.id,
        existing_transaction_date: transaction.transaction_date,
        reason:
          similarity >= 0.95 && dayDistance === 0
            ? 'exact'
            : dayDistance > 0
              ? 'fuzzy_date'
              : 'fuzzy_description',
      } satisfies ImportDuplicateCandidate
    })
    .filter((candidate): candidate is ImportDuplicateCandidate => Boolean(candidate))
    .sort((left, right) => right.confidence - left.confidence)

  return matches[0] ?? null
}

export function detectDuplicateRowsInFile(rows: NormalizedImportRowInput[]) {
  const counts = new Map<string, number>()

  for (const row of rows) {
    const key = `${row.transaction_date}:${row.amount_cents}:${normalizeText(row.description)}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
}

export function suggestCategory(
  row: NormalizedImportRowInput,
  rules: AutoCategorizationRuleMatch[],
  categories: TransactionCategorySummary[],
): ImportCategorySuggestion {
  const orderedRules = [...rules].sort((left, right) => right.priority - left.priority)

  for (const rule of orderedRules) {
    const source = rule.is_case_sensitive ? row.description : normalizeText(row.description)
    const pattern = rule.is_case_sensitive ? rule.pattern : normalizeText(rule.pattern)

    let matched = false

    if (rule.is_regex) {
      try {
        const expression = new RegExp(rule.pattern, rule.is_case_sensitive ? '' : 'i')
        matched = expression.test(row.description)
      } catch {
        matched = false
      }
    } else {
      matched = source.includes(pattern)
    }

    if (matched) {
      return {
        category_id: rule.category_id,
        confidence: 0.95,
        matched_pattern: rule.pattern,
        source: 'rule',
      }
    }
  }

  for (const hint of MERCHANT_CATEGORY_HINTS) {
    if (!hint.patterns.some((pattern) => pattern.test(row.description))) {
      continue
    }

    const category = categories.find((candidate) =>
      hint.categoryNames.some((pattern) => pattern.test(candidate.name)),
    )

    if (category) {
      return {
        category_id: category.id,
        confidence: 0.8,
        matched_pattern: category.name,
        source: 'merchant',
      }
    }
  }

  return {
    category_id: null,
    confidence: 0,
    matched_pattern: null,
    source: null,
  }
}

export function detectUnexpectedCharge(
  row: NormalizedImportRowInput,
  commitments: CancelledSubscriptionMatch[],
): ImportUnexpectedChargeMatch | null {
  if (row.is_income) {
    return null
  }

  const match = commitments.find((commitment) => {
    if (!commitment.service_name) {
      return false
    }

    return (
      normalizeText(row.description).includes(normalizeText(commitment.service_name)) &&
      row.transaction_date > commitment.cancelled_at.slice(0, 10)
    )
  })

  if (!match || !match.service_name) {
    return null
  }

  return {
    cancelled_at: match.cancelled_at,
    commitment_id: match.id,
    commitment_name: match.name,
    service_name: match.service_name,
  }
}

export function findExpectedIncomeGapsAfterImport(
  commitments: IncomeCommitmentGapCandidate[],
  transactions: Array<Pick<NormalizedImportRowInput, 'amount_cents' | 'is_income' | 'transaction_date'> & {
    account_id: string
    recurring_id?: string | null
  }>,
) {
  return commitments.filter((commitment) => {
    if (!commitment.is_income || commitment.status !== 'active') {
      return false
    }

    const tolerance = commitment.tolerance_days ?? 0
    const dueDate = new Date(`${commitment.next_due_date}T00:00:00`)
    const now = new Date()
    const elapsedDays = Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000))

    if (elapsedDays <= tolerance) {
      return false
    }

    return !transactions.some((transaction) => {
      const accountMatch = transaction.account_id === commitment.account_id
      const amountMatch = Math.abs(transaction.amount_cents - commitment.amount_cents) <= 100
      const recurringMatch = transaction.recurring_id === commitment.id

      return (
        transaction.is_income &&
        (recurringMatch || (accountMatch && amountMatch)) &&
        countMonthsUntil(transaction.transaction_date, commitment.next_due_date) === 0
      )
    })
  })
}
