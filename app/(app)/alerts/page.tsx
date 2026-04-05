import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { AlertsPageClient } from '@/components/alerts/AlertsPageClient'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata() {
  const t = await getTranslations('alerts')

  return {
    title: `${t('title')} — Patrimio`,
  }
}

export default async function AlertsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <AlertsPageClient />
}
