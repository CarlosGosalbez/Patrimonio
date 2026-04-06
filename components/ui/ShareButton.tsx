'use client'

import { Share2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface ShareData {
    title: string
    text?: string
    url?: string
}

interface ShareButtonProps {
    data: ShareData
    className?: string
    children?: React.ReactNode
    /** Fallback: copy URL to clipboard if Web Share API not available */
    fallbackCopy?: boolean
}

/**
 * Uses the Web Share API (Safari iOS 16.4+ as PWA, Chrome Android).
 * Falls back to clipboard copy on desktop browsers.
 */
export function ShareButton({
    data,
    className,
    children,
    fallbackCopy = true,
}: ShareButtonProps) {
    const [copied, setCopied] = useState(false)

    async function handleShare() {
        if (navigator.share) {
            try {
                await navigator.share(data)
            } catch (err) {
                // User cancelled — not an error
                if (err instanceof Error && err.name !== 'AbortError') {
                    console.error('[ShareButton] share failed', err)
                }
            }
            return
        }

        // Fallback: copy URL to clipboard
        if (fallbackCopy && data.url) {
            try {
                await navigator.clipboard.writeText(data.url)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            } catch {
                console.error('[ShareButton] clipboard write failed')
            }
        }
    }

    // Don't render if neither share nor clipboard is available
    if (typeof navigator === 'undefined') return null

    return (
        <button
            type="button"
            onClick={handleShare}
            aria-label={copied ? 'URL copiada' : (data.title ? `Compartir: ${data.title}` : 'Compartir')}
            className={cn(
                'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium',
                'bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                '[-webkit-tap-highlight-color:transparent]',
                className,
            )}
        >
            <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {children ?? (copied ? 'Copiado' : 'Compartir')}
        </button>
    )
}
