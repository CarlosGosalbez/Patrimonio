import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertAlertsPreferences } from '@/lib/alerts/mutations'
import { alertPreferencesSchema } from '@/lib/alerts/schemas'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const parsed = alertPreferencesSchema.safeParse(await request.json())

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  try {
    const preferences = await upsertAlertsPreferences({
      input: parsed.data,
      supabase,
      userId: user.id,
    })

    return NextResponse.json({ preferences })
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : 'Internal server error' },
      { status: 400 },
    )
  }
}
