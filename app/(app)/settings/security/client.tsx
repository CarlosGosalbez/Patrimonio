'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Separator } from '@/components/ui/separator'
import { TwoFactorSetup } from '@/components/auth/TwoFactorSetup'

interface SecuritySettingsClientProps {
    tfaEnabled: boolean
    factorId?: string
}

export function SecuritySettingsClient({ tfaEnabled, factorId }: SecuritySettingsClientProps) {
    const router = useRouter()
    const t = useTranslations('settings.security')

    const handleChange = () => {
        router.refresh()
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
            <div>
                <h1 className="text-xl font-semibold">{t('title')}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
            </div>

            <Separator />

            <section className="space-y-3">
                <h2 className="text-base font-medium">{t('twoFactorSection')}</h2>
                <TwoFactorSetup
                    enabled={tfaEnabled}
                    factorId={factorId}
                    onChange={handleChange}
                />
            </section>
        </div>
    )
}
