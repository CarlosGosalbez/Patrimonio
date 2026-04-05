import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listImportBatches } from '@/lib/imports/server'

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
    const response = await listImportBatches({
      supabase,
      userId: user.id,
    })

    return NextResponse.json(response)
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
