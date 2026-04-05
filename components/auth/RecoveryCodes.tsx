'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Copy, CheckCircle2, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface RecoveryCodesProps {
    codes: string[]
    onDone?: () => void
    onRegenerate?: (newCodes: string[]) => void
}

export function RecoveryCodes({ codes, onDone, onRegenerate }: RecoveryCodesProps) {
    const t = useTranslations('recoveryCodes')
    const tCommon = useTranslations('common')
    const [copied, setCopied] = useState(false)
    const [showRegenConfirm, setShowRegenConfirm] = useState(false)
    const [regenerating, setRegenerating] = useState(false)

    const copyAll = async () => {
        await navigator.clipboard.writeText(codes.join('\n'))
        setCopied(true)
        toast.success(t('copySuccess'))
        setTimeout(() => setCopied(false), 2000)
    }

    const download = () => {
        const content = [
            'Patrimio — Códigos de recuperación 2FA',
            '======================================',
            'Guarda estos códigos en un lugar seguro.',
            'Cada código solo se puede usar una vez.',
            '',
            ...codes,
        ].join('\n')

        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'patrimio-recovery-codes.txt'
        a.click()
        URL.revokeObjectURL(url)
    }

    const regenerate = async () => {
        setRegenerating(true)
        setShowRegenConfirm(false)
        const res = await fetch('/api/auth/recovery-codes', { method: 'POST' })
        const json = await res.json()
        setRegenerating(false)
        if (!res.ok) { toast.error(t('regenError')); return }
        toast.success(t('regenSuccess'))
        onRegenerate?.(json.codes)
    }

    return (
        <div className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                <AlertDescription className="text-sm">{t('warning')}</AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-muted/50 border">
                {codes.map((code, i) => (
                    <code
                        key={i}
                        className="text-sm font-mono tracking-wider text-center py-1 px-2 rounded bg-background border"
                    >
                        {code}
                    </code>
                ))}
            </div>

            <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copyAll} className="gap-1.5">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t('copied') : t('copyAll')}
                </Button>
                <Button variant="outline" size="sm" onClick={download} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    {t('download')}
                </Button>
                {onRegenerate && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground ml-auto"
                        onClick={() => setShowRegenConfirm(true)}
                        disabled={regenerating}
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {t('regenerate')}
                    </Button>
                )}
            </div>

            {onDone && (
                <Button className="w-full" onClick={onDone}>
                    {t('done')}
                </Button>
            )}

            <Dialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('regenTitle')}</DialogTitle>
                        <DialogDescription>{t('regenDescription')}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowRegenConfirm(false)}>{tCommon('cancel')}</Button>
                        <Button onClick={regenerate}>{t('regenConfirm')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
