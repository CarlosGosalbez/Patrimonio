import { createClient } from '@/lib/supabase/server'
import { DashboardPageClient } from '@/components/dashboard/DashboardPageClient'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export async function generateMetadata() {
    const t = await getTranslations('dashboard')

    return {
        title: `${t('title')} — Patrimio`,
    }
}

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return <DashboardPageClient />
}
