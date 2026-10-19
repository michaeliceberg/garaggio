import { redirect } from 'next/navigation'
import { isAuthed } from '@/lib/auth'
import LoginForm from './login-form'

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
    if (isAuthed()) redirect('/')
    return (
        <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
            <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.webp" alt="Garaggio" className="mx-auto w-full max-w-xs rounded-3xl" />
                <p className="mt-3 text-gold">Бонджорно, маэстро! 🤌</p>
            </div>
            <LoginForm error={!!searchParams.error} />
        </main>
    )
}
