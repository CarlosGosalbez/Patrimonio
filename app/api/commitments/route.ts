import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCommitment } from '@/lib/commitments/mutations'
import { getCommitmentsOverview } from '@/lib/commitments/server'
import { commitmentInputSchema } from '@/lib/commitments/schemas'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const overview = await getCommitmentsOverview({
      supabase,
      userId: user.id,
    })

    return NextResponse.json(overview)
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const parsed = commitmentInputSchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  try {
    const commitment = await createCommitment({
      input: parsed.data,
      supabase,
      userId: user.id,
    })

    return NextResponse.json({ commitment }, { status: 201 })
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : 'Internal server error' },
      { status: 400 },
    )
  }
}
