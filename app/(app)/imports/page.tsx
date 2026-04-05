import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import { ImportsPageClient } from '@/components/imports/ImportsPageClient'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata() {
  const t = await getTranslations('imports')

  return {
    title: `${t('title')} — Patrimio`,
  }
}

export default async function ImportsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <ImportsPageClient />
}
