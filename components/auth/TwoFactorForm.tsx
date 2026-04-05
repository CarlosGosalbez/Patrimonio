'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function TwoFactorForm() {
    const t = useTranslations('twoFactor')
    const router = useRouter()
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [useRecovery, setUseRecovery] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const handleTOTP = async () => {
        setLoading(true)
        setError(null)
        const supabase = createClient()

        try {
            const { data: factors } = await supabase.auth.mfa.listFactors()
            const totp = factors?.totp?.[0]

            if (!totp) {
                router.push('/dashboard')
                return
            }

            const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: totp.id,
            })
            if (challengeError) throw challengeError

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: totp.id,
                challengeId: challenge.id,
                code: code.replace(/\s/g, ''),
            })

            if (verifyError) {
                setError(t('codeIncorrect'))
                return
            }

            toast.success(t('toastSuccess'))
            router.push('/dashboard')
            router.refresh()
        } catch {
            setError(t('error'))
        } finally {
            setLoading(false)
        }
    }

    const handleRecoveryCode = async () => {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/auth/use-recovery-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code.trim().toLowerCase() }),
        })

        const json = await res.json()
        setLoading(false)

        if (!res.ok) {
            setError(json.error ?? t('recoveryInvalid'))
            return
        }

        toast.success(t('recoverySuccess'))
        router.push('/dashboard')
        router.refresh()
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!code.trim()) return
        if (useRecovery) handleRecoveryCode()
        else handleTOTP()
    }

    return (
        <Card className="shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border-0">
            <CardHeader className="space-y-1 pb-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
                    <ShieldCheck className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
                <CardDescription>
                    {useRecovery ? t('descriptionRecovery') : t('descriptionTOTP')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive" role="alert">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="two-factor-code">
                            {useRecovery ? t('recoveryCodeLabel') : t('codeLabel')}
                        </Label>
                        <Input
                            id="two-factor-code"
                            ref={inputRef}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            type="text"
                            inputMode={useRecovery ? 'text' : 'numeric'}
                            autoComplete={useRecovery ? 'one-time-code' : 'off'}
                            placeholder={useRecovery ? t('placeholderRecovery') : t('placeholderTOTP')}
                            maxLength={useRecovery ? 16 : 7}
                            className="h-14 text-center text-2xl tracking-[0.5em] font-mono"
                            aria-describedby={error ? 'two-factor-error' : undefined}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-11 font-medium"
                        disabled={loading || !code.trim()}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                {t('submitting')}
                            </>
                        ) : (
                            t('submit')
                        )}
                    </Button>
                </form>

                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={() => { setUseRecovery(!useRecovery); setCode(''); setError(null) }}
                        className="text-sm text-muted-foreground hover:text-foreground [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                        {useRecovery ? t('useAuthenticator') : t('useRecovery')}
                    </button>
                </div>
            </CardContent>
        </Card>
    )
}
