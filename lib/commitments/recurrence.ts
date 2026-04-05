import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  isAfter,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { formatMonth } from '@/lib/financial/formatters'
import type {
  AlertRecurrence,
  CommitmentFrequency,
  CommitmentRow,
  CommitmentStatus,
  CustomAlertRow,
  ProjectedBucket,
  ProjectedFlowPoint,
} from '@/lib/commitments/types'

export const UPCOMING_COMMITMENT_DAYS = 7
export const CUSTOM_ALERT_LOOKAHEAD_DAYS = 60

function toDate(date: string | Date) {
  return typeof date === 'string' ? parseISO(date) : date
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function addFrequency(date: Date, frequency: CommitmentFrequency) {
  switch (frequency) {
    case 'daily':
      return addDays(date, 1)
    case 'weekly':
      return addDays(date, 7)
    case 'biweekly':
      return addDays(date, 14)
    case 'monthly':
      return addMonths(date, 1)
    case 'bimonthly':
      return addMonths(date, 2)
    case 'quarterly':
      return addMonths(date, 3)
    case 'semiannual':
      return addMonths(date, 6)
    case 'annual':
      return addMonths(date, 12)
    default:
      return addMonths(date, 1)
  }
}

export function addAlertRecurrence(date: Date, recurrence: AlertRecurrence) {
  switch (recurrence) {
    case 'monthly':
      return addMonths(date, 1)
    case 'quarterly':
      return addMonths(date, 3)
    case 'semiannual':
      return addMonths(date, 6)
    case 'annual':
      return addMonths(date, 12)
    case 'biennial':
      return addMonths(date, 24)
    case 'once':
    default:
      return date
  }
}

export function getCommitmentStatus(
  commitment: Pick<CommitmentRow, 'end_date' | 'is_active'>,
  now: Date = new Date(),
): CommitmentStatus {
  if (!commitment.is_active) {
    return 'paused'
  }

  if (commitment.end_date && isAfter(startOfDay(now), startOfDay(toDate(commitment.end_date)))) {
    return 'expired'
  }

  return 'active'
}

export function getNextDueInDays(nextDueDate: string, now: Date = new Date()) {
  return differenceInCalendarDays(startOfDay(toDate(nextDueDate)), startOfDay(now))
}

export function getEffectiveCommitmentNextDueDate(
  commitment: Pick<CommitmentRow, 'end_date' | 'frequency' | 'next_due_date'>,
  now: Date = new Date(),
) {
  const hardEnd = commitment.end_date ? startOfDay(toDate(commitment.end_date)) : null
  let cursor = startOfDay(toDate(commitment.next_due_date))
  let guard = 0

  while (isAfter(startOfDay(now), cursor) && guard < 240) {
    const next = startOfDay(addFrequency(cursor, commitment.frequency))

    if (hardEnd && isAfter(next, hardEnd)) {
      return cursor
    }

    cursor = next
    guard += 1
  }

  return cursor
}

export function getEffectiveAlertDueDate(
  alert: Pick<CustomAlertRow, 'due_date' | 'recurrence'>,
  now: Date = new Date(),
) {
  let cursor = startOfDay(toDate(alert.due_date))
  let guard = 0

  while (isAfter(startOfDay(now), cursor) && alert.recurrence !== 'once' && guard < 120) {
    cursor = startOfDay(addAlertRecurrence(cursor, alert.recurrence))
    guard += 1
  }

  return cursor
}

export function getMonthlyEquivalent(amountCents: number, frequency: CommitmentFrequency) {
  switch (frequency) {
    case 'daily':
      return Math.round(amountCents * 30)
    case 'weekly':
      return Math.round((amountCents * 52) / 12)
    case 'biweekly':
      return Math.round((amountCents * 26) / 12)
    case 'monthly':
      return amountCents
    case 'bimonthly':
      return Math.round(amountCents / 2)
    case 'quarterly':
      return Math.round(amountCents / 3)
    case 'semiannual':
      return Math.round(amountCents / 6)
    case 'annual':
      return Math.round(amountCents / 12)
    default:
      return amountCents
  }
}

export function buildFutureMonths(count: number, from: Date = new Date()) {
  const months: Date[] = []
  const base = startOfMonth(from)

  for (let index = 0; index < count; index += 1) {
    months.push(addMonths(base, index))
  }

  return months
}

export function getOccurrencesInRange(
  commitment: Pick<CommitmentRow, 'end_date' | 'frequency' | 'next_due_date'>,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const occurrences: string[] = []
  const hardEnd = commitment.end_date ? toDate(commitment.end_date) : null
  let cursor = startOfDay(toDate(commitment.next_due_date))
  let guard = 0

  while (!isAfter(cursor, rangeEnd) && guard < 240) {
    if (!hardEnd || !isAfter(cursor, hardEnd)) {
      if (!isAfter(rangeStart, cursor)) {
        occurrences.push(toIsoDate(cursor))
      }
    }

    cursor = addFrequency(cursor, commitment.frequency)
    guard += 1
  }

  return occurrences
}

export function occursInMonth(
  commitment: Pick<CommitmentRow, 'end_date' | 'frequency' | 'next_due_date'>,
  monthDate: Date,
) {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)

  return getOccurrencesInRange(commitment, monthStart, monthEnd).length > 0
}

export function buildProjectedBuckets(points: ProjectedFlowPoint[]) {
  const ranges = [
    { days: 30, label: '30d' },
    { days: 60, label: '60d' },
    { days: 90, label: '90d' },
  ]

  return ranges.map<ProjectedBucket>((range, index) => ({
    label: range.label,
    net_cents: points
      .slice(0, index + 1)
      .reduce((sum, point) => sum + point.net_cents, 0),
  }))
}

export function isDateWithinWindow(date: string, rangeStart: Date, rangeEnd: Date) {
  const target = startOfDay(toDate(date))
  return !isAfter(rangeStart, target) && !isAfter(target, rangeEnd)
}

export function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

export function isAmountClose(expectedAmount: number | null, actualAmount: number, tolerance = 0.2) {
  if (expectedAmount === null) {
    return true
  }

  const delta = Math.abs(expectedAmount - actualAmount)
  return delta <= Math.max(150, Math.round(expectedAmount * tolerance))
}

export function buildCommitmentTag(commitmentId: string) {
  return `commitment:${commitmentId}`
}

export function buildMonthLabel(month: string) {
  return formatMonth(month)
}
