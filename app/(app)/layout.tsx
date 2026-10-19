import Link from 'next/link'
import { Car, BellRing, Plus, LogOut, Wallet } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { logout } from '../actions'

// Всё, кроме входа, — только для мастера. Сверху логотип, снизу на телефоне — панель из 3 кнопок.
export default function AppLayout({ children }: { children: React.ReactNode }) {
    requireAuth()
    return (
        <div className="mx-auto min-h-screen max-w-2xl pb-28">
            <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
                <Link href="/" className="flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-small.webp" alt="Garaggio" className="h-12 w-auto rounded-lg" />
                </Link>
                <form action={logout}>
                    <button className="flex items-center gap-1 text-sm text-muted" aria-label="Выйти"><LogOut size={18} /></button>
                </form>
            </header>
            <main className="flex flex-col gap-4 p-4">{children}</main>
            <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
                <div className="mx-auto grid max-w-2xl grid-cols-4">
                    <Link href="/" className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted"><Car size={24} />Машины</Link>
                    <Link href="/cars/new" className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-gold"><Plus size={24} />Новая машина</Link>
                    <Link href="/due" className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted"><BellRing size={24} />Пора на ТО</Link>
                    <Link href="/money" className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted"><Wallet size={24} />Деньги</Link>
                </div>
            </nav>
        </div>
    )
}
