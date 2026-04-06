import type { SupabaseClient } from '@supabase/supabase-js'
import { parseCurrencyInput } from '@/lib/financial/formatters'
import type { Database } from '@/types/database'
import type { budgetInputSchema, budgetPatchSchema } from '@/lib/budgets/schemas'
import type { z } from 'zod'

type ServerClient = SupabaseClient<Database>
type BudgetInput = z.infer<typeof budgetInputSchema>
type BudgetPatch = z.infer<typeof budgetPatchSchema>

async function ensureBudgetCategory({
  categoryId,
  supabase,
  userId,
}: {
  categoryId: string
  supabase: ServerClient
  userId: string
}) {
  const { data, error } = await supabase
    .from('categories')
    .select('id,is_income,user_id')
    .eq('id', categoryId)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Budget category not found')
  }

  if (data.is_income) {
    throw new Error('Budgets only support expense categories')
  }

  if (data.user_id && data.user_id !== userId) {
    throw new Error('Budget category is not accessible for this user')
  }
}

export async function createBudget({
  input,
  supabase,
  userId,
}: {
  input: BudgetInput
  supabase: ServerClient
  userId: string
}) {
  await ensureBudgetCategory({
    categoryId: input.category_id,
    supabase,
    userId,
  })

  const limit_cents = parseCurrencyInput(input.limit_input)

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      alert_threshold: input.alert_threshold,
      category_id: input.category_id,
      currency: input.currency,
      end_date: input.end_date,
      is_active: input.is_active,
      limit_cents,
      period: input.period,
      start_date: input.start_date,
      user_id: userId,
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create budget')
  }

  return data
}

export async function updateBudget({
  id,
  input,
  supabase,
  userId,
}: {
  id: string
  input: BudgetPatch
  supabase: ServerClient
  userId: string
}) {
  if (input.category_id) {
    await ensureBudgetCategory({
      categoryId: input.category_id,
      supabase,
      userId,
    })
  }

  const payload: Database['public']['Tables']['budgets']['Update'] = {
    alert_threshold: input.alert_threshold,
    category_id: input.category_id,
    currency: input.currency,
    end_date: input.end_date,
    is_active: input.is_active,
    period: input.period,
    start_date: input.start_date,
  }

  if (input.limit_input) {
    payload.limit_cents = parseCurrencyInput(input.limit_input)
  }

  const { data, error } = await supabase
    .from('budgets')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to update budget')
  }

  return data
}

export async function softDeleteBudget({
  id,
  supabase,
  userId,
}: {
  id: string
  supabase: ServerClient
  userId: string
}) {
  const { error } = await supabase
    .from('budgets')
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
