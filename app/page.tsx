import { getTranslations } from 'next-intl/server'

export async function generateMetadata() {
  const t = await getTranslations('metadata')

  return {
    title: t('appTitle'),
  }
}

export default async function Home() {
  const t = await getTranslations('home')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">{t('title')}</h1>
      <p className="mt-4 text-lg text-gray-600">{t('subtitle')}</p>
    </main>
  )
}
