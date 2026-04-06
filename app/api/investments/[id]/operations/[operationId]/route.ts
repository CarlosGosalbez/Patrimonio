import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { softDeleteInvestmentOperation } from '@/lib/investments/mutations'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; operationId: string } },
) {
  const { id, operationId } = params
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    await softDeleteInvestmentOperation({
      id: operationId,
      investmentId: id,
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
