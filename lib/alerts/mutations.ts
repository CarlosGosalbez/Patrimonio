import type { SupabaseClient } from '@supabase/supabase-js'
import { parseCurrencyInput } from '@/lib/financial/formatters'
import type { Database } from '@/types/database'
import type { alertPreferencesSchema, customAlertInputSchema, customAlertPatchSchema } from '@/lib/alerts/schemas'
import type { z } from 'zod'

type ServerClient = SupabaseClient<Database>
type CustomAlertInput = z.infer<typeof customAlertInputSchema>
type CustomAlertPatch = z.infer<typeof customAlertPatchSchema>
type AlertsPreferencesInput = z.infer<typeof alertPreferencesSchema>

export async function createCustomAlert({
  input,
  supabase,
  userId,
}: {
  input: CustomAlertInput
  supabase: ServerClient
  userId: string
}) {
  const expected_amount_cents = input.expected_amount_input
    ? parseCurrencyInput(input.expected_amount_input)
    : null

  const { data, error } = await supabase
    .from('custom_alerts')
    .insert({
      advance_notice_days: input.advance_notice_days,
      auto_deactivate: input.auto_deactivate,
      category_id: input.category_id,
      currency: input.currency,
      description: input.description,
      dismissed_until: input.dismissed_until,
      due_date: input.due_date,
      expected_amount_cents,
      is_active: input.is_active,
      name: input.name,
      recurrence: input.recurrence,
      user_id: userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create alert')
  }

  return data.id
}

export async function updateCustomAlert({
  id,
  input,
  supabase,
  userId,
}: {
  id: string
  input: CustomAlertPatch
  supabase: ServerClient
  userId: string
}) {
  const payload: Database['public']['Tables']['custom_alerts']['Update'] = {
    advance_notice_days: input.advance_notice_days,
    auto_deactivate: input.auto_deactivate,
    category_id: input.category_id,
    currency: input.currency,
    description: input.description,
    dismissed_until: input.dismissed_until,
    due_date: input.due_date,
    is_active: input.is_active,
    name: input.name,
    recurrence: input.recurrence,
  }

  if (input.expected_amount_input !== undefined) {
    payload.expected_amount_cents = input.expected_amount_input
      ? parseCurrencyInput(input.expected_amount_input)
      : null
  }

  const { error } = await supabase
    .from('custom_alerts')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function softDeleteCustomAlert({
  id,
  supabase,
  userId,
}: {
  id: string
  supabase: ServerClient
  userId: string
}) {
  const { error } = await supabase
    .from('custom_alerts')
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function upsertAlertsPreferences({
  input,
  supabase,
  userId,
}: {
  input: AlertsPreferencesInput
  supabase: ServerClient
  userId: string
}) {
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      weekly_alert_digest_enabled: input.weekly_alert_digest_enabled,
    },
    {
      onConflict: 'user_id',
    },
  )

  if (error) {
    throw new Error(error.message)
  }

  return {
    weekly_alert_digest_enabled: input.weekly_alert_digest_enabled,
  }
}
