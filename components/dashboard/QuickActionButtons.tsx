'use client'

import { useId, useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useAccountsQuery } from '@/hooks/usePhaseThree'
import { decToCents, formatCurrency } from '@/lib/financial/formatters'
import { requestJson } from '@/lib/http/client'

interface QuickAction {
    emoji: string
    labelKey: string
    categoryName: string
    isIncome: boolean
}

const QUICK_ACTIONS: QuickAction[] = [
    { emoji: '🛒', labelKey: 'supermarket', categoryName: 'Supermercado', isIncome: false },
    { emoji: '👕', labelKey: 'clothing', categoryName: 'Ropa', isIncome: false },
    { emoji: '🚗', labelKey: 'transport', categoryName: 'Transporte público', isIncome: false },
    { emoji: '☕', labelKey: 'restaurant', categoryName: 'Restaurantes', isIncome: false },
    { emoji: '💊', labelKey: 'health', categoryName: 'Sanidad', isIncome: false },
    { emoji: '🎮', labelKey: 'leisure', categoryName: 'Ocio y entretenimiento', isIncome: false },
    { emoji: '💰', labelKey: 'income', categoryName: 'Otros ingresos', isIncome: true },
    { emoji: '📲', labelKey: 'bizumIn', categoryName: 'Bizum recibido', isIncome: true },
    { emoji: '💼', labelKey: 'salary', categoryName: 'Nómina', isIncome: true },
]

interface CreateTransactionPayload {
    account_id: string
    category_id: string | null
    amount_cents: number
    description: string
    is_income: boolean
}

export function QuickActionButtons({ categoryMap }: { categoryMap: Record<string, string> }) {
    const t = useTranslations('dashboard.quickActions')
    const queryClient = useQueryClient()
    const accountsQuery = useAccountsQuery()
    const accounts = accountsQuery.data ?? []

    const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null)
    const [amountInput, setAmountInput] = useState('')
    const [accountId, setAccountId] = useState('')

    const amountInputId = useId()
    const accountSelectId = useId()
    const amountErrorId = useId()

    const mutation = useMutation({
        mutationFn: (payload: CreateTransactionPayload) =>
            requestJson<{ transaction: { id: string; amount_cents: number; description: string } }>(
                '/api/transactions',
                { method: 'POST', body: JSON.stringify(payload) },
            ),
        onSuccess: (data, variables) => {
            void queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
            void queryClient.invalidateQueries({ queryKey: ['transactions'] })
            toast.success(
                t('toast', {
                    amount: formatCurrency(Math.abs(data.transaction.amount_cents)),
                    category: selectedAction?.categoryName ?? '',
                }),
            )
            setSelectedAction(null)
            setAmountInput('')
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : t('error'))
        },
    })

    function openAction(action: QuickAction) {
        setSelectedAction(action)
        setAmountInput('')
        if (accounts.length === 1) {
            setAccountId(accounts[0]!.id)
        }
    }

    function handleSave() {
        if (!selectedAction || !accountId) return
        const parsed = parseFloat(amountInput.replace(',', '.'))
        if (!Number.isFinite(parsed) || parsed <= 0) return

        const amount_cents = decToCents(parsed)
        const category_id = categoryMap[selectedAction.categoryName] ?? null

        mutation.mutate({
            account_id: accountId,
            category_id,
            amount_cents,
            description: selectedAction.categoryName,
            is_income: selectedAction.isIncome,
        })
    }

    const amountError = amountInput && (parseFloat(amountInput.replace(',', '.')) <= 0 || isNaN(parseFloat(amountInput.replace(',', '.'))))

    return (
        <>
            <div
                role="region"
                aria-label={t('ariaLabel')}
                className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9"
            >
                {QUICK_ACTIONS.map((action) => (
                    <button
                        key={action.labelKey}
                        type="button"
                        aria-label={t(action.labelKey)}
                        onClick={() => openAction(action)}
                        className="flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border border-border/60 bg-card p-2 text-xs font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="text-2xl" aria-hidden="true">{action.emoji}</span>
                        <span className="text-muted-foreground">{t(action.labelKey)}</span>
                    </button>
                ))}
            </div>

            <Dialog open={selectedAction !== null} onOpenChange={(open) => !open && setSelectedAction(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedAction?.emoji} {selectedAction ? t(selectedAction.labelKey) : ''}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        <div className="space-y-1">
                            <Label htmlFor={amountInputId}>{t('amount')}</Label>
                            <Input
                                id={amountInputId}
                                inputMode="decimal"
                                placeholder="0,00"
                                value={amountInput}
                                onChange={(e) => setAmountInput(e.target.value)}
                                aria-describedby={amountError ? amountErrorId : undefined}
                                aria-invalid={amountError ? 'true' : undefined}
                                className="min-h-[48px] text-lg"
                                autoFocus
                            />
                            {amountError ? (
                                <p id={amountErrorId} role="alert" className="text-xs text-destructive">
                                    {t('amountError')}
                                </p>
                            ) : null}
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor={accountSelectId}>{t('account')}</Label>
                            <select
                                id={accountSelectId}
                                value={accountId}
                                onChange={(e) => setAccountId(e.target.value)}
                                className="min-h-[48px] w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">{t('selectAccount')}</option>
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button
                            className="w-full min-h-[48px]"
                            disabled={!accountId || !amountInput || !!amountError || mutation.isPending}
                            onClick={handleSave}
                        >
                            {mutation.isPending ? t('saving') : t('save')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
