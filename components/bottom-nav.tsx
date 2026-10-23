'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Car, BellRing, Plus, Inbox, CalendarDays } from 'lucide-react'
import { AppMenu } from './app-menu'

type Tab = 'cars' | 'calendar' | 'new' | 'due' | 'inbox' | null
const tabOf = (p: string): Tab =>
    p === '/cars/new' ? 'new'
        : p === '/' || p.startsWith('/cars') || p.startsWith('/visits') ? 'cars'
            : p.startsWith('/calendar') ? 'calendar'
                : p.startsWith('/due') ? 'due'
                    : p.startsWith('/inbox') ? 'inbox' : null

// Нижнее меню. Выбранный раздел: иконка подпрыгивает, под ней светится «таблетка», подпись золотая.
// Подсвечиваем сразу по нажатию (страница может грузиться секунду), потом — по адресу.
export function BottomNav({ tg, unread, money }: { tg: boolean; unread: number; money: boolean }) {
    const pathname = usePathname()
    const [tapped, setTapped] = useState<Tab>(null)
    useEffect(() => setTapped(null), [pathname])
    const active = tapped ?? tabOf(pathname)

    const item = (tab: Exclude<Tab, 'new' | null>, href: string, Icon: typeof Car, label: string, badge = 0) => {
        const on = active === tab
        return (
            <Link href={href} onClick={() => setTapped(tab)} aria-current={on ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-colors duration-300 ${on ? 'text-gold' : 'text-muted'}`}>
                <span key={on ? 'on' : 'off'} className={`nav-pill ${on ? 'nav-pill-on' : ''}`}>
                    <Icon size={24} strokeWidth={on ? 2.4 : 2} />
                </span>
                {label}
                {badge > 0 && <span className="absolute right-[18%] top-1 min-w-[18px] rounded-full bg-tomato px-1 text-center text-[11px] font-black leading-[18px] text-white">{badge}</span>}
            </Link>
        )
    }

    return (
        <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
            <div className="relative mx-auto max-w-2xl"><AppMenu money={money} /></div>
            <div className={`mx-auto grid max-w-2xl ${tg ? 'grid-cols-5' : 'grid-cols-4'}`}>
                {item('cars', '/', Car, 'Машины')}
                {item('calendar', '/calendar', CalendarDays, 'Запись')}
                {/* главное действие — посередине, круглой кнопкой, приподнятой над панелью */}
                <Link href="/cars/new" onClick={() => setTapped('new')} aria-label="Новая машина" aria-current={active === 'new' ? 'page' : undefined}
                    className="flex flex-col items-center gap-1 pb-2.5 text-xs font-semibold text-olive">
                    <span key={active === 'new' ? 'on' : 'off'}
                        className={`-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-bg bg-basil text-white shadow-[0_3px_0_#33541C] ${active === 'new' ? 'nav-plus-on' : ''}`}>
                        <Plus size={28} strokeWidth={3} />
                    </span>
                    Машина
                </Link>
                {item('due', '/due', BellRing, 'Пора на ТО')}
                {tg && item('inbox', '/inbox', Inbox, 'Ящик', unread)}
            </div>
        </nav>
    )
}
