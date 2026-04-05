import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    const t = await getTranslations('common')

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex items-center justify-center p-4">
            <div className="absolute top-4 right-4">
                <LanguageSwitcher />
            </div>
            <div className="w-full max-w-[440px] animate-fade-in">
                {/* Logo + Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/25 mb-4">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="w-8 h-8 text-white"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Patrimio</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t('brand')}</p>
                </div>
                {children}
            </div>
        </div>
    )
}
