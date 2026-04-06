import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AnalyticsPageClient } from '@/components/analytics/AnalyticsPageClient'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata() {
  const t = await getTranslations('analytics')

  return {
    title: `${t('title')} — Patrimio`,
  }
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <AnalyticsPageClient />
}
