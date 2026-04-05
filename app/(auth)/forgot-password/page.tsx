import { getTranslations } from 'next-intl/server'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export async function generateMetadata() {
    const t = await getTranslations('forgotPassword')

    return {
        title: `${t('title')} — Patrimio`,
    }
}

export default function ForgotPasswordPage() {
    return <ForgotPasswordForm />
}
