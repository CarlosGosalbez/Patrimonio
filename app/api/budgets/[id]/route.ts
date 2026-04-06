import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { softDeleteBudget, updateBudget } from '@/lib/budgets/mutations'
import { budgetPatchSchema } from '@/lib/budgets/schemas'

const budgetSelect = `
  id,
  user_id,
  category_id,
  period,
  limit_cents,
  currency,
  alert_threshold,
  start_date,
  end_date,
  is_active,
  created_at,
  updated_at,
  deleted_at,
  category:categories(id,name,color,icon)
`

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data, error: dbError } = await supabase
    .from('budgets')
    .select(budgetSelect)
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (dbError || !data) {
    return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
  }

  return NextResponse.json({ budget: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const parsed = budgetPatchSchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  try {
    const budget = await updateBudget({
      id,
      input: parsed.data,
      supabase,
      userId: user.id,
    })

    return NextResponse.json({ budget })
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : 'Internal server error' },
      { status: 400 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    await softDeleteBudget({
      id,
      supabase,
      userId: user.id,
    })

    return NextResponse.json({ ok: true })
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : 'Internal server error' },
      { status: 400 },
    )
  }
}
