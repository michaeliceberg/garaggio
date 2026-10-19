import { redirect } from 'next/navigation'
import { isAuthed } from '@/lib/auth'
import LoginForm from './login-form'

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
    if (isAuthed()) redirect('/')
    return (
        <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
            <div className="text-center">
                <div className="text-6xl">🔧</div>
                <h1 className="mt-2 text-4xl font-black tracking-wide">Garaggio</h1>
                <p className="mt-1 text-gold">Бонджорно, маэстро!</p>
            </div>
            <LoginForm error={!!searchParams.error} />
        </main>
    )
}
