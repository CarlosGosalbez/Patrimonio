import type { SupabaseClient } from '@supabase/supabase-js'
import { daysUntil, getAlertUrgency, getNextAlertDueDate, isAlertSnoozed } from '@/lib/alerts/schedule'
import type { AlertsPreferences, CustomAlertListItem, CustomAlertsResponse } from '@/lib/alerts/types'
import type { Database } from '@/types/database'

type ServerClient = SupabaseClient<Database>

type AlertSelectRow = Database['public']['Tables']['custom_alerts']['Row'] & {
  category: CustomAlertListItem['category']
}

type PaymentCandidate = Pick<
  Database['public']['Tables']['transactions']['Row'],
  'amount_cents' | 'category_id' | 'is_income' | 'transaction_date'
>

const alertSelect = `
  id,
  user_id,
  category_id,
  name,
  description,
  expected_amount_cents,
  currency,
  recurrence,
  due_date,
  advance_notice_days,
  dismissed_until,
  auto_deactivate,
  is_active,
  created_at,
  updated_at,
  deleted_at,
  category:categories(id,name,color,icon,is_income)
`

const SYSTEM_ALERT_NAMES = new Set([
  'IBI (Impuesto sobre Bienes Inmuebles)',
  'IRPF (Declaración de la Renta)',
  'Impuesto de Circulación (IVTM)',
  'Seguro del Coche',
  'Seguro del Hogar',
  'Tasa de Basura',
])

function toDate(value: string | Date) {
  return value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`)
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function hasPaymentForCycle(alert: AlertSelectRow, dueDate: string, payments: PaymentCandidate[]) {
  if (!alert.auto_deactivate || !alert.category_id) {
    return false
  }

  const due = toDate(dueDate)
  const windowStart = new Date(due)
  windowStart.setDate(windowStart.getDate() - Math.max(alert.advance_notice_days, 45))
  const windowEnd = new Date(due)
  windowEnd.setDate(windowEnd.getDate() + 14)

  return payments.some((payment) => {
    if (payment.is_income || payment.category_id !== alert.category_id) {
      return false
    }

    const paymentDate = toDate(payment.transaction_date)

    if (paymentDate < windowStart || paymentDate > windowEnd) {
      return false
    }

    if (alert.expected_amount_cents === null) {
      return true
    }

    return Math.abs(payment.amount_cents - alert.expected_amount_cents) <= 100
  })
}

export async function ensureDefaultCustomAlerts(supabase: ServerClient, userId: string) {
  const { count, error } = await supabase
    .from('custom_alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }

  if ((count ?? 0) === 0) {
    const { error: rpcError } = await supabase.rpc('create_default_custom_alerts', {
      p_user_id: userId,
    })

    if (rpcError) {
      throw new Error(rpcError.message)
    }
  }
}

export async function getAlertsPreferences(
  supabase: ServerClient,
  userId: string,
): Promise<AlertsPreferences> {
  const { data, error } = await supabase
    .from('profiles')
    .select('weekly_alert_digest_enabled')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return {
    weekly_alert_digest_enabled: data?.weekly_alert_digest_enabled ?? false,
  }
}

export async function getCustomAlertsPageData({
  supabase,
  userId,
}: {
  supabase: ServerClient
  userId: string
}): Promise<CustomAlertsResponse> {
  await ensureDefaultCustomAlerts(supabase, userId)

  const today = new Date()
  const paymentRangeStart = new Date(today)
  paymentRangeStart.setDate(paymentRangeStart.getDate() - 120)
  const paymentRangeEnd = new Date(today)
  paymentRangeEnd.setDate(paymentRangeEnd.getDate() + 90)

  const [{ data: alertsData, error: alertsError }, { data: paymentsData, error: paymentsError }, preferences] =
    await Promise.all([
      supabase
        .from('custom_alerts')
        .select(alertSelect)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('due_date', { ascending: true }),
      supabase
        .from('transactions')
        .select('category_id,amount_cents,transaction_date,is_income')
        .eq('user_id', userId)
        .gte('transaction_date', toIsoDate(paymentRangeStart))
        .lte('transaction_date', toIsoDate(paymentRangeEnd))
        .is('deleted_at', null),
      getAlertsPreferences(supabase, userId),
    ])

  if (alertsError) {
    throw new Error(alertsError.message)
  }

  if (paymentsError) {
    throw new Error(paymentsError.message)
  }

  const payments = (paymentsData ?? []) as PaymentCandidate[]
  const alerts = ((alertsData ?? []) as AlertSelectRow[]).map<CustomAlertListItem>((alert) => {
    const next_due_date = getNextAlertDueDate(alert, today)
    const is_snoozed = isAlertSnoozed(alert, next_due_date)
    const is_paid_for_cycle = hasPaymentForCycle(alert, next_due_date, payments)
    const severity = getAlertUrgency(daysUntil(next_due_date, today))

    return {
      ...alert,
      category: alert.category ?? null,
      is_paid_for_cycle,
      is_snoozed,
      is_system_default: SYSTEM_ALERT_NAMES.has(alert.name),
      next_due_date,
      severity,
    }
  })

  const upcoming_deadlines = alerts
    .filter((alert) => {
      if (!alert.is_active || alert.is_snoozed || alert.is_paid_for_cycle) {
        return false
      }

      const remainingDays = daysUntil(alert.next_due_date, today)
      return remainingDays >= 0 && remainingDays <= 60
    })
    .sort((left, right) => {
      const daysLeft = daysUntil(left.next_due_date, today)
      const daysRight = daysUntil(right.next_due_date, today)
      return daysLeft - daysRight
    })

  return {
    alerts,
    preferences,
    upcoming_deadlines,
  }
}

export async function getCustomAlertById({
  id,
  supabase,
  userId,
}: {
  id: string
  supabase: ServerClient
  userId: string
}) {
  const pageData = await getCustomAlertsPageData({ supabase, userId })
  const match = pageData.alerts.find((alert) => alert.id === id)

  if (!match) {
    throw new Error('Custom alert not found')
  }

  return match
}
