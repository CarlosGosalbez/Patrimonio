'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { loginAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

type LoginValues = { email: string; password: string }

export function LoginForm() {
    const t = useTranslations('login')
    const tAuth = useTranslations('auth')
    const searchParams = useSearchParams()
    const [showPassword, setShowPassword] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)

    const LoginSchema = useMemo(
        () =>
            z
                .object({
                    email: z.email({ message: tAuth('emailInvalid') }),
                    password: z.string().min(1, t('passwordRequired')),
                })
                .strict(),
        [t, tAuth],
    )

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginValues>({ resolver: zodResolver(LoginSchema) })

    const onSubmit = async (values: LoginValues) => {
        setServerError(null)

        const formData = new FormData()
        formData.append('email', values.email)
        formData.append('password', values.password)
        formData.append('next', searchParams.get('next') ?? '/dashboard')

        // Server Action sets cookies before redirect — eliminates race condition with middleware
        const result = await loginAction(formData)

        if (result?.error) {
            setServerError(t('credentialsError'))
        }
        // On success, the Server Action calls redirect() server-side — no client navigation needed
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
                        <Label htmlFor="email">{tAuth('emailLabel')}</Label>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            autoCapitalize="none"
                            inputMode="email"
                            placeholder={tAuth('emailPlaceholder')}
                            className="h-11"
                            aria-describedby={errors.email ? 'email-error' : undefined}
                            {...register('email')}
                        />
                        {errors.email && (
                            <p id="email-error" role="alert" className="text-xs text-destructive">
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">{t('passwordLabel')}</Label>
                            <a href="/forgot-password" className="text-xs text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded">
                                {t('forgotPassword')}
                            </a>
                        </div>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                className="h-11 pr-11"
                                aria-describedby={errors.password ? 'password-error' : undefined}
                                {...register('password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded [-webkit-tap-highlight-color:transparent] p-0.5"
                                aria-label={showPassword ? tAuth('toggleHidePassword') : tAuth('toggleShowPassword')}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p id="password-error" role="alert" className="text-xs text-destructive">
                                {errors.password.message}
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

                {/* REGISTRO_LINK_DISABLED — para reactivar, descomentar el bloque siguiente */}
                {/* <div className="mt-5 text-center text-sm text-muted-foreground">
                    {t('noAccount')}{' '}
                    <a href="/register" className="text-primary font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded">
                        {t('signUp')}
                    </a>
                </div> */}
            </CardContent>
        </Card>
    )
}
