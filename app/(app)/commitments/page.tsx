import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { CommitmentsPageClient } from '@/components/commitments/CommitmentsPageClient'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata() {
  const t = await getTranslations('commitments')

  return {
    title: `${t('title')} — Patrimio`,
  }
}

export default async function CommitmentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <CommitmentsPageClient />
}
