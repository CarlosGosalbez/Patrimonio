'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BellRing,
  ChartColumnIncreasing,
  LineChart,
  FileText,
  FolderCog,
  Import,
  LayoutDashboard,
  Landmark,
  WalletCards,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { OfflineIndicator } from '@/components/ui/OfflineIndicator'
import { PageTransition } from '@/components/providers/PageTransition'
import { cn } from '@/lib/utils'

const navigation = [
  { href: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { href: '/investments', icon: Landmark, key: 'investments' },
  { href: '/analytics', icon: LineChart, key: 'analytics' },
  { href: '/reports', icon: FileText, key: 'reports' },
  { href: '/imports', icon: Import, key: 'imports' },
  { href: '/commitments', icon: WalletCards, key: 'commitments' },
  { href: '/alerts', icon: BellRing, key: 'alerts' },
  { href: '/settings/security', icon: FolderCog, key: 'settings' },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const t = useTranslations('appShell')
  const { unreadCount } = useNotificationsRealtime()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.10),_transparent_30%),hsl(var(--background))]">
      {/* Skip to main content — WCAG 2.4.1 */}
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>

      <OfflineIndicator />

      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20">
              <ChartColumnIncreasing className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Patrimio</p>
              <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher className="hidden sm:flex" />
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto min-h-[calc(100vh-73px)] max-w-6xl px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-6 sm:px-6 sm:pb-10"
        tabIndex={-1}
      >
        <PageTransition>
          {children}
        </PageTransition>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-8 gap-1 rounded-2xl bg-muted/60 p-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon
            const showBadge = item.key === 'alerts' && unreadCount > 0

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-[52px] flex-col items-center justify-center rounded-xl px-1 text-[10px] font-medium transition sm:min-h-[56px] sm:px-2 sm:text-[11px]',
                  isActive
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
                aria-label={t(item.key)}
              >
                <span className="relative">
                  <Icon className="h-5 w-5 sm:mb-1 sm:h-4 sm:w-4" aria-hidden="true" />
                  {showBadge ? (
                    <span className="absolute -right-2 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  ) : null}
                </span>
                <span className="hidden sm:block">{t(item.key)}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
