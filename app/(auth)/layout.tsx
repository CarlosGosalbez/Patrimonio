import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    const t = await getTranslations('metadata')

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-4">
            <div className="absolute top-4 right-4">
                <LanguageSwitcher />
            </div>
            <div className="w-full max-w-[440px] animate-fade-in">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <Image
                        src="/logo.png"
                        alt={t('logoAlt')}
                        width={400}
                        height={120}
                        priority
                        className="h-14 w-auto"
                    />
                </div>
                {children}
            </div>
        </div>
    )
}
