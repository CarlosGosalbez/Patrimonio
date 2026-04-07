'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

type LogoVariant = 'header' | 'login' | 'default'

const sizes: Record<LogoVariant, { width: number; height: number; className: string }> = {
    header: { width: 320, height: 96, className: 'h-8 w-auto' },
    login: { width: 400, height: 120, className: 'h-16 w-auto' },
    default: { width: 400, height: 120, className: 'h-12 w-auto' },
}

interface LogoProps {
    variant?: LogoVariant
    /** Extra CSS classes forwarded to the <Image> wrapper */
    className?: string
}

export function Logo({ variant = 'default', className }: LogoProps) {
    const t = useTranslations('metadata')
    const { width, height, className: sizeClass } = sizes[variant]

    return (
        <Image
            src="/logo.png"
            alt={t('logoAlt')}
            width={width}
            height={height}
            priority={variant === 'login'}
            className={[sizeClass, className].filter(Boolean).join(' ')}
        />
    )
}
