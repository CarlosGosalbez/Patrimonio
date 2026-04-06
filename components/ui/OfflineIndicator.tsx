'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(false)
    const [wasOffline, setWasOffline] = useState(false)

    useEffect(() => {
        setIsOffline(!navigator.onLine)

        const handleOffline = () => {
            setIsOffline(true)
            setWasOffline(true)
        }
        const handleOnline = () => {
            setIsOffline(false)
        }

        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)
        return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
        }
    }, [])

    if (!isOffline && !wasOffline) return null

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={isOffline ? 'Sin conexión - modo offline' : 'Conexión restaurada'}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all duration-300 ${isOffline
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                }`}
        >
            <WifiOff className="h-3 w-3 shrink-0" aria-hidden="true" />
            {isOffline ? 'Sin conexión — usando datos en caché' : 'Conexión restaurada'}
        </div>
    )
}
