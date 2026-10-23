import Link from 'next/link'
import { LogOut, Package, Wallet } from 'lucide-react'
import { BottomNav } from '@/components/bottom-nav'
import { MONEY } from '@/lib/features'
import { requireAuth } from '@/lib/auth'
import { logout } from '../actions'
import { tgEnabled, unreadCount } from '@/lib/tg'

// Всё, кроме входа, — только для мастера. Сверху логотип, снизу на телефоне — панель кнопок, «+ Машина» посередине («Ящик» — если бот настроен).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
    requireAuth()
    const tg = tgEnabled()
    const unread = tg ? await unreadCount().catch(() => 0) : 0
    return (
        <div className="mx-auto min-h-screen max-w-2xl pb-28">
            <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur">
                <Link href="/" className="flex shrink-0 items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-small.webp" alt="Garaggio" className="h-12 w-auto rounded-lg" />
                </Link>
                {/* слоган — тянется на всё место между логотипом и кнопками справа */}
                <Link href="/" className="relative mx-2 flex h-14 min-w-0 flex-1 items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/slogan.webp" alt="Perfecto Pohuini" className="relative h-full w-full object-contain" />
                </Link>
                <div className="flex shrink-0 items-center gap-4">
                    <Link href="/stock" className="flex flex-col items-center text-[11px] font-semibold text-muted" aria-label="Склад"><Package size={22} />Склад</Link>
                    {MONEY && <Link href="/money" className="flex items-center gap-1.5 text-sm font-semibold text-muted"><Wallet size={20} />Деньги</Link>}
                    <form action={logout}>
                        <button className="flex items-center gap-1 text-sm text-muted" aria-label="Выйти"><LogOut size={18} /></button>
                    </form>
                </div>
            </header>
            <main className="flex flex-col gap-4 p-4">{children}</main>
            <BottomNav tg={tg} unread={unread} />
        </div>
    )
}
