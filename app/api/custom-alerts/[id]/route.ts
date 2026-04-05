import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  softDeleteCustomAlert,
  updateCustomAlert,
} from '@/lib/alerts/mutations'
import { getCustomAlertById } from '@/lib/alerts/server'
import { customAlertPatchSchema } from '@/lib/alerts/schemas'

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

  try {
    const alert = await getCustomAlertById({
      id,
      supabase,
      userId: user.id,
    })

    return NextResponse.json({ alert })
  } catch {
    return NextResponse.json({ error: 'Custom alert not found' }, { status: 404 })
  }
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

  const parsed = customAlertPatchSchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  try {
    const alert = await updateCustomAlert({
      id,
      input: parsed.data,
      supabase,
      userId: user.id,
    })

    return NextResponse.json({ alert })
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
    await softDeleteCustomAlert({
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
