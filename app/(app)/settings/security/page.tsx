import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = {
    title: 'Configuración y Seguridad — Patrimio',
}

// This page is a server component shell — the actual interactive UI
// (TwoFactorSetup, RecoveryCodes) is rendered via client components.
export default async function SecuritySettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Check if user has any TOTP factor enrolled
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totpFactor = factors?.totp?.[0]

    const { SecuritySettingsClient } = await import('./client')

    return (
        <SecuritySettingsClient
            tfaEnabled={!!totpFactor}
            factorId={totpFactor?.id}
        />
    )
}
