'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { safeString } from '@/lib/validation/safe-zod'
import { z } from 'zod'

const FeedbackSchema = z.object({
    title: safeString(200).min(1),
    description: safeString(2000).min(1),
    type: z.enum(['bug', 'mejora', 'duda']),
}).strict()

interface ReportProblemDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ReportProblemDialog({ open, onOpenChange }: ReportProblemDialogProps) {
    const t = useTranslations('reportProblem')
    const uid = useId()
    const supabase = createClient()

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [type, setType] = useState<'bug' | 'mejora' | 'duda'>('bug')
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)

    function handleClose(value: boolean) {
        if (!value) {
            setTitle('')
            setDescription('')
            setType('bug')
            setError(null)
            setSuccess(false)
        }
        onOpenChange(value)
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)

        const parsed = FeedbackSchema.safeParse({ title, description, type })
        if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? t('errorToast'))
            return
        }

        setSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Unauthorized')

            const { error: dbError } = await (supabase as unknown as { from: (t: string) => { insert: (v: unknown) => Promise<{ error: { message: string } | null }> } }).from('feedback').insert({
                user_id: user.id,
                title: parsed.data.title,
                description: parsed.data.description,
                type: parsed.data.type,
            })

            if (dbError) throw new Error(dbError.message)
            setSuccess(true)
            setTimeout(() => handleClose(false), 1500)
        } catch (err) {
            setError(err instanceof Error ? err.message : t('errorToast'))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                </DialogHeader>

                <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
                    {error && (
                        <p role="alert" aria-live="assertive" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    {success && (
                        <p role="status" aria-live="polite" className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                            {t('successToast')}
                        </p>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor={`${uid}-title`}>{t('fields.problemTitle')}</Label>
                        <Input
                            id={`${uid}-title`}
                            className="min-h-[44px]"
                            placeholder={t('fields.problemTitlePlaceholder')}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`${uid}-type`}>{t('fields.type')}</Label>
                        <select
                            id={`${uid}-type`}
                            value={type}
                            onChange={(e) => setType(e.target.value as 'bug' | 'mejora' | 'duda')}
                            className="flex min-h-[44px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="bug">{t('fields.typeBug')}</option>
                            <option value="mejora">{t('fields.typeMejora')}</option>
                            <option value="duda">{t('fields.typeDuda')}</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor={`${uid}-description`}>{t('fields.description')}</Label>
                        <Textarea
                            id={`${uid}-description`}
                            placeholder={t('fields.descriptionPlaceholder')}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            required
                            className="resize-none"
                        />
                    </div>

                    <Button type="submit" className="w-full min-h-[44px]" disabled={saving || success}>
                        {saving ? t('submitting') : t('submit')}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
