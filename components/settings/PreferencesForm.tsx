'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { usePreferencesQuery, useUpdatePreferencesMutation } from '@/hooks/useUserPreferences'
import {
    PreferencesSchema,
    DEFAULT_PREFERENCES,
    SUPPORTED_CURRENCIES,
    SUPPORTED_LOCALES,
    DATE_FORMATS,
    THEMES,
    CURRENCY_INFO,
    type UserPreferences,
} from '@/lib/preferences/types'
import { toast } from 'sonner'

export function PreferencesForm() {
    const t = useTranslations('preferences')
    const tCommon = useTranslations('common')
    const prefsQuery = usePreferencesQuery()
    const updatePrefs = useUpdatePreferencesMutation()

    const currencyId = useId()
    const localeId = useId()
    const dateFormatId = useId()
    const decimalPlacesId = useId()
    const firstDayWeekId = useId()
    const themeId = useId()

    const {
        register,
        handleSubmit,
        formState: { errors, isDirty, isSubmitting },
    } = useForm<UserPreferences>({
        resolver: zodResolver(PreferencesSchema),
        values: prefsQuery.data
            ? {
                base_currency: prefsQuery.data.base_currency as UserPreferences['base_currency'],
                locale: prefsQuery.data.locale as UserPreferences['locale'],
                date_format: prefsQuery.data.date_format as UserPreferences['date_format'],
                decimal_places: prefsQuery.data.decimal_places,
                first_day_week: prefsQuery.data.first_day_week,
                theme: prefsQuery.data.theme as UserPreferences['theme'],
            }
            : DEFAULT_PREFERENCES,
    })

    async function onSubmit(data: UserPreferences) {
        try {
            await updatePrefs.mutateAsync(data)
            toast.success(t('saved'))
        } catch (error) {
            toast.error(t('errorSaving'))
        }
    }

    if (prefsQuery.isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t('title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('title')}</CardTitle>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Base Currency */}
                    <div className="space-y-2">
                        <Label htmlFor={currencyId}>{t('baseCurrency')}</Label>
                        <select
                            id={currencyId}
                            {...register('base_currency')}
                            className="min-h-[44px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {SUPPORTED_CURRENCIES.map((currency) => (
                                <option key={currency} value={currency}>
                                    {CURRENCY_INFO[currency].symbol} {currency} — {CURRENCY_INFO[currency].name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">{t('baseCurrencyDescription')}</p>
                        {errors.base_currency && (
                            <p className="text-xs text-destructive" role="alert">
                                {errors.base_currency.message}
                            </p>
                        )}
                    </div>

                    {/* Locale */}
                    <div className="space-y-2">
                        <Label htmlFor={localeId}>{t('locale')}</Label>
                        <select
                            id={localeId}
                            {...register('locale')}
                            className="min-h-[44px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {SUPPORTED_LOCALES.map((locale) => (
                                <option key={locale} value={locale}>
                                    {locale === 'es' ? 'Español' : 'English'}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">{t('localeDescription')}</p>
                        {errors.locale && (
                            <p className="text-xs text-destructive" role="alert">
                                {errors.locale.message}
                            </p>
                        )}
                    </div>

                    {/* Date Format */}
                    <div className="space-y-2">
                        <Label htmlFor={dateFormatId}>{t('dateFormat')}</Label>
                        <select
                            id={dateFormatId}
                            {...register('date_format')}
                            className="min-h-[44px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {DATE_FORMATS.map((format) => (
                                <option key={format} value={format}>
                                    {format}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">{t('dateFormatDescription')}</p>
                        {errors.date_format && (
                            <p className="text-xs text-destructive" role="alert">
                                {errors.date_format.message}
                            </p>
                        )}
                    </div>

                    {/* Decimal Places */}
                    <div className="space-y-2">
                        <Label htmlFor={decimalPlacesId}>{t('decimalPlaces')}</Label>
                        <select
                            id={decimalPlacesId}
                            {...register('decimal_places', { valueAsNumber: true })}
                            className="min-h-[44px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {[0, 1, 2, 3, 4].map((n) => (
                                <option key={n} value={n}>
                                    {n} {n === 1 ? 'decimal' : 'decimales'}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">{t('decimalPlacesDescription')}</p>
                        {errors.decimal_places && (
                            <p className="text-xs text-destructive" role="alert">
                                {errors.decimal_places.message}
                            </p>
                        )}
                    </div>

                    {/* First Day of Week */}
                    <div className="space-y-2">
                        <Label htmlFor={firstDayWeekId}>{t('firstDayWeek')}</Label>
                        <select
                            id={firstDayWeekId}
                            {...register('first_day_week', { valueAsNumber: true })}
                            className="min-h-[44px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <option value={1}>{t('firstDayMonday')}</option>
                            <option value={0}>{t('firstDaySunday')}</option>
                        </select>
                        <p className="text-xs text-muted-foreground">{t('firstDayWeekDescription')}</p>
                        {errors.first_day_week && (
                            <p className="text-xs text-destructive" role="alert">
                                {errors.first_day_week.message}
                            </p>
                        )}
                    </div>

                    {/* Theme */}
                    <div className="space-y-2">
                        <Label htmlFor={themeId}>{t('theme')}</Label>
                        <select
                            id={themeId}
                            {...register('theme')}
                            className="min-h-[44px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            {THEMES.map((theme) => (
                                <option key={theme} value={theme}>
                                    {t(`theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`)}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">{t('themeDescription')}</p>
                        {errors.theme && (
                            <p className="text-xs text-destructive" role="alert">
                                {errors.theme.message}
                            </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={!isDirty || isSubmitting}
                            className="min-h-[44px] min-w-[120px]"
                        >
                            {isSubmitting ? tCommon('loading') : tCommon('save')}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
