import Link from 'next/link'
import { Car, BellRing, Plus, LogOut, Wallet, Inbox, CalendarDays } from 'lucide-react'
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
                <Link href="/" className="flex items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-small.webp" alt="Garaggio" className="h-12 w-auto rounded-lg" />
                </Link>
                <div className="flex items-center gap-4">
                    <Link href="/money" className="flex items-center gap-1.5 text-sm font-semibold text-muted"><Wallet size={20} />Деньги</Link>
                    <form action={logout}>
                        <button className="flex items-center gap-1 text-sm text-muted" aria-label="Выйти"><LogOut size={18} /></button>
                    </form>
                </div>
            </header>
            <main className="flex flex-col gap-4 p-4">{children}</main>
            <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
                <div className={`mx-auto grid max-w-2xl ${tg ? 'grid-cols-5' : 'grid-cols-4'}`}>
                    <Link href="/" className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted"><Car size={24} />Машины</Link>
                    <Link href="/calendar" className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted"><CalendarDays size={24} />Запись</Link>
                    {/* главное действие — посередине, круглой кнопкой, приподнятой над панелью */}
                    <Link href="/cars/new" aria-label="Новая машина" className="flex flex-col items-center gap-1 pb-3 text-xs font-semibold text-olive">
                        <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-bg bg-basil text-white shadow-[0_3px_0_#33541C]"><Plus size={28} strokeWidth={3} /></span>
                        Машина
                    </Link>
                    <Link href="/due" className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted"><BellRing size={24} />Пора на ТО</Link>
                    {tg && (
                        <Link href="/inbox" className="relative flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted">
                            <Inbox size={24} />Ящик
                            {unread > 0 && <span className="absolute right-[22%] top-1.5 min-w-[18px] rounded-full bg-tomato px-1 text-center text-[11px] font-black leading-[18px] text-white">{unread}</span>}
                        </Link>
                    )}
                </div>
            </nav>
        </div>
    )
}
