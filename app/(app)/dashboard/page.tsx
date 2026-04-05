import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'

export const metadata = {
    title: 'Dashboard — Patrimio',
}

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const t = await getTranslations('dashboard')

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h1 className="text-2xl font-semibold text-foreground mb-2">{t('title')}</h1>
            <p className="text-muted-foreground text-sm max-w-sm">
                {t('subtitle')}
                <br />{t('comingSoon')}
            </p>
        </div>
    )
}
