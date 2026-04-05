import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  softDeleteCommitment,
  updateCommitment,
} from '@/lib/commitments/mutations'
import { getCommitmentById } from '@/lib/commitments/server'
import { commitmentPatchSchema } from '@/lib/commitments/schemas'

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
    const commitment = await getCommitmentById({
      id,
      supabase,
      userId: user.id,
    })

    return NextResponse.json({ commitment })
  } catch {
    return NextResponse.json({ error: 'Commitment not found' }, { status: 404 })
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

  const parsed = commitmentPatchSchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  try {
    const commitment = await updateCommitment({
      id,
      input: parsed.data,
      supabase,
      userId: user.id,
    })

    return NextResponse.json({ commitment })
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
    await softDeleteCommitment({
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
