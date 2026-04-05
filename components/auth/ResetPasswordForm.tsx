'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PasswordStrength } from './PasswordStrength'

type Values = { password: string; confirmPassword: string }

export function ResetPasswordForm() {
    const t = useTranslations('resetPassword')
    const tReg = useTranslations('register')
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)

    const Schema = useMemo(
        () =>
            z
                .object({
                    password: z
                        .string()
                        .min(12, tReg('passwordMin'))
                        .regex(/[A-Z]/, tReg('passwordUppercase'))
                        .regex(/[a-z]/, tReg('passwordLowercase'))
                        .regex(/[0-9]/, tReg('passwordNumber'))
                        .regex(/[^A-Za-z0-9]/, tReg('passwordSymbol')),
                    confirmPassword: z.string(),
                })
                .strict()
                .refine((d) => d.password === d.confirmPassword, {
                    message: tReg('passwordMismatch'),
                    path: ['confirmPassword'],
                }),
        [tReg],
    )

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<Values>({ resolver: zodResolver(Schema) })

    const passwordValue = watch('password', '')

    const onSubmit = async (values: Values) => {
        setServerError(null)
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password: values.password })
        if (error) {
            setServerError(t('error'))
            return
        }
        toast.success(t('toastSuccess'))
        router.push('/login')
    }

    return (
        <Card className="shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border-0">
            <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                    {serverError && (
                        <Alert variant="destructive" role="alert">
                            <AlertDescription>{serverError}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="reset-password">{t('newPasswordLabel')}</Label>
                        <div className="relative">
                            <Input
                                id="reset-password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                className="h-11 pr-11"
                                aria-describedby={errors.password ? 'reset-pass-error' : undefined}
                                {...register('password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded [-webkit-tap-highlight-color:transparent] p-0.5"
                                aria-label={showPassword ? t('toggleHidePassword') : t('toggleShowPassword')}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <PasswordStrength password={passwordValue} />
                        {errors.password && (
                            <p id="reset-pass-error" role="alert" className="text-xs text-destructive">
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="reset-confirm">{tReg('confirmPasswordLabel')}</Label>
                        <Input
                            id="reset-confirm"
                            type="password"
                            autoComplete="new-password"
                            className="h-11"
                            aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
                            {...register('confirmPassword')}
                        />
                        {errors.confirmPassword && (
                            <p id="reset-confirm-error" role="alert" className="text-xs text-destructive">
                                {errors.confirmPassword.message}
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
            </CardContent>
        </Card>
    )
}
