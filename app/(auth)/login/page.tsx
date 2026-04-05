import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = {
    title: 'Iniciar sesión — Patrimio',
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    )
}
