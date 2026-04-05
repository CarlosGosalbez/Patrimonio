'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Values = { email: string }

export function ForgotPasswordForm() {
    const t = useTranslations('forgotPassword')
    const tAuth = useTranslations('auth')
    const [sent, setSent] = useState(false)

    const Schema = useMemo(
        () => z.object({ email: z.email({ message: tAuth('emailInvalid') }) }).strict(),
        [tAuth],
    )

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<Values>({ resolver: zodResolver(Schema) })

    const onSubmit = async (values: Values) => {
        const supabase = createClient()
        const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
            redirectTo: `${window.location.origin}/api/auth/callback`,
        })
        // Always show success to prevent email enumeration
        if (error) console.error('Reset password error:', error.message)
        setSent(true)
        toast.success(t('toastSuccess'))
    }

    if (sent) {
        return (
            <Card className="shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border-0">
                <CardHeader className="space-y-1 pb-4 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
                        <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl font-semibold">{t('sentTitle')}</CardTitle>
                    <CardDescription>{t('sentDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">{t('expiresIn')}</p>
                    <a href="/login" className="inline-flex items-center gap-1.5 text-primary text-sm font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded">
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {tAuth('backToLogin')}
                    </a>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border-0">
            <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    <div className="space-y-1.5">
                        <Label htmlFor="forgot-email">{t('emailLabel')}</Label>
                        <Input
                            id="forgot-email"
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            placeholder={tAuth('emailPlaceholder')}
                            className="h-11"
                            aria-describedby={errors.email ? 'forgot-email-error' : undefined}
                            {...register('email')}
                        />
                        {errors.email && (
                            <p id="forgot-email-error" role="alert" className="text-xs text-destructive">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    <Button type="submit" className="w-full h-11 font-medium" disabled={isSubmitting}>
                        {isSubmitting ? (
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
                    <a href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded">
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {tAuth('backToLogin')}
                    </a>
                </div>
            </CardContent>
        </Card>
    )
}
