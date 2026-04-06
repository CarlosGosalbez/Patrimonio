import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { getAnalyticsSummary } from '@/lib/analytics/server'
import { createClient } from '@/lib/supabase/server'

const analyticsPeriodSchema = z.enum(['week', 'month', 'quarter', 'year'])

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const parsedPeriod = analyticsPeriodSchema.safeParse(
    request.nextUrl.searchParams.get('period') ?? 'month',
  )

  if (!parsedPeriod.success) {
    return NextResponse.json({ error: parsedPeriod.error.issues }, { status: 400 })
  }

  try {
    const t = await getTranslations('analytics')
    const summary = await getAnalyticsSummary({
      period: parsedPeriod.data,
      supabase,
      uncategorizedLabel: t('uncategorized'),
      userId: user.id,
    })

    return NextResponse.json(summary)
  } catch (routeError) {
    return NextResponse.json(
      { error: routeError instanceof Error ? routeError.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
