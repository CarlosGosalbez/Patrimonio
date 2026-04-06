import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PushNotificationsSettings } from '@/components/settings/PushNotificationsSettings'

export async function generateMetadata() {
    const t = await getTranslations('pushNotifications')
    return { title: `${t('title')} — Patrimio` }
}

export default async function NotificationsSettingsPage() {
    const t = await getTranslations('pushNotifications')

    return (
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
            <Card>
                <CardHeader>
                    <CardTitle>{t('title')}</CardTitle>
                    <CardDescription>{t('description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <PushNotificationsSettings />
                </CardContent>
            </Card>
        </div>
    )
}
