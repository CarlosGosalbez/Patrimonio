'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Landmark } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { decToCents } from '@/lib/financial/formatters'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const

export default function OnboardingPage() {
    const t = useTranslations('onboarding')
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const OnboardingSchema = useMemo(
        () =>
            z
                .object({
                    bank_name: z.string().min(1, t('bankRequired')).max(100).trim(),
                    account_name: z.string().min(1, t('accountNameRequired')).max(100).trim(),
                    currency: z.enum(CURRENCIES),
                    initial_balance: z
                        .string()
                        .regex(/^\d+([.,]\d{1,2})?$/, t('balanceInvalid'))
                        .or(z.literal('')),
                })
                .strict(),
        [t],
    )

    type OnboardingData = z.infer<typeof OnboardingSchema>

    const form = useForm<OnboardingData>({
        resolver: zodResolver(OnboardingSchema),
        defaultValues: {
            bank_name: '',
            account_name: 'Cuenta corriente',
            currency: 'EUR',
            initial_balance: '0',
        },
    })

    const onSubmit = async (data: OnboardingData) => {
        setLoading(true)
        setError(null)
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setError(t('sessionExpired'))
            setLoading(false)
            return
        }

        const balanceCents = data.initial_balance
            ? decToCents(parseFloat(data.initial_balance.replace(',', '.')))
            : 0

        const { error: dbError } = await supabase.from('accounts').insert({
            user_id: user.id,
            name: data.account_name,
            bank_name: data.bank_name,
            currency: data.currency,
            current_balance_cents: balanceCents,
            initial_balance_cents: balanceCents,
            account_type: 'checking',
            is_default: true,
            is_hidden: false,
        })

        setLoading(false)

        if (dbError) {
            setError(t('error'))
            return
        }

        toast.success(t('successToast'))
        router.push('/dashboard')
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
            <div className="w-full max-w-md space-y-6 animate-fade-in">
                <div className="text-center space-y-2">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
                        <Landmark className="w-7 h-7 text-white" aria-hidden="true" />
                    </div>
                    <h1 className="text-2xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
                </div>

                <div className="shadow-xl shadow-slate-200/50 rounded-xl border bg-card p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                            {error && (
                                <Alert variant="destructive" role="alert">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <FormField
                                control={form.control}
                                name="bank_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('bankLabel')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t('bankPlaceholder')}
                                                className="h-11"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="account_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('accountNameLabel')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t('accountNamePlaceholder')}
                                                className="h-11"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="currency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('currencyLabel')}</FormLabel>
                                            <FormControl>
                                                <select
                                                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    {...field}
                                                >
                                                    {CURRENCIES.map((c) => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="initial_balance"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('balanceLabel')}</FormLabel>
                                            <FormControl>
                                                <Input
                                                    inputMode="decimal"
                                                    placeholder="0,00"
                                                    className="h-11"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
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
                    </Form>
                </div>
            </div>
        </div>
    )
}
