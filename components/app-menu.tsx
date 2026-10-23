'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Package, ShoppingCart, Wallet, LogOut, X, BellRing } from 'lucide-react'
import { logout } from '@/app/actions'

// «Меню» справа вверху (Склад — справа, под большой палец правши): редкие разделы плитками (нижняя панель — только то, что нужно каждый день).
// Новый раздел — просто ещё одна плитка в TILES. «Выйти» — мелко внизу: нужно редко (вошли с чужого телефона).
export function AppMenu({ money }: { money: boolean }) {
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()
    useEffect(() => setMounted(true), [])
    useEffect(() => setOpen(false), [pathname])
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('keydown', onKey)
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
    }, [open])

    const TILES = [
        { href: '/order', icon: ShoppingCart, label: 'Что заказать', hint: 'к ТО по записям', color: '#F2C35B' },
        { href: '/stock', icon: Package, label: 'Склад', hint: 'масло и фильтры', color: '#8DB255' },
        { href: '/reminders', icon: BellRing, label: 'Напоминания', hint: 'бот пишет сам', color: '#2AABEE' },
        ...(money ? [{ href: '/money', icon: Wallet, label: 'Деньги', hint: 'долги и выручка', color: '#53ADEF' }] : []),
    ]

    return (
        <>
            <button type="button" onClick={() => setOpen(true)} aria-label="Меню" aria-expanded={open}
                className="flex flex-col items-center text-[11px] font-semibold text-muted">
                <LayoutGrid size={22} />Меню
            </button>
            {mounted && open && createPortal(
                <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Меню">
                    <button type="button" aria-label="Закрыть" className="menu-fade absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
                    <div className="menu-sheet relative w-full max-w-2xl rounded-t-3xl border-t border-line bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
                        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-black">Меню</h2>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть" className="flex h-10 w-10 items-center justify-center rounded-full bg-bg text-muted"><X size={20} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {TILES.map(({ href, icon: Icon, label, hint, color }) => {
                                const on = pathname.startsWith(href)
                                return (
                                    <Link key={href} href={href} onClick={() => setOpen(false)}
                                        className={`flex min-h-[96px] flex-col justify-between rounded-2xl border p-3 active:translate-y-[2px] ${on ? 'border-gold/60 bg-gold/10' : 'border-line bg-bg'}`}>
                                        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}26`, color }}><Icon size={22} /></span>
                                        <span><b className="block">{label}</b><span className="block text-xs text-muted">{hint}</span></span>
                                    </Link>
                                )
                            })}
                        </div>
                        <form action={logout} className="mt-4 flex justify-center">
                            <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted"><LogOut size={16} />Выйти из Garaggio</button>
                        </form>
                    </div>
                </div>,
                document.body,
            )}
        </>
    )
}
