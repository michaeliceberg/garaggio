'use client'

import { useTransition } from 'react'
import { Check, Clock } from 'lucide-react'
import { setPaid } from '@/app/actions'

// Плашка «оплачено / не оплачено» с кнопкой переключения — на странице визита и в списке долгов.
export function PaidToggle({ visitId, paid, compact }: { visitId: number; paid: boolean; compact?: boolean }) {
    const [pending, start] = useTransition()
    const toggle = () => start(() => setPaid(visitId, !paid))
    if (compact) return (
        <button onClick={toggle} disabled={pending} className="shrink-0 rounded-xl bg-olive px-3 py-2 text-sm font-black text-bg disabled:opacity-50">
            {pending ? '…' : 'Оплатил ✓'}
        </button>
    )
    return (
        <div className={`flex items-center justify-between gap-2 rounded-xl p-3 text-sm ${paid ? 'bg-olive/10 text-olive' : 'bg-tomato/15 text-tomato'}`}>
            <span className="flex items-center gap-2 font-bold">{paid ? <><Check size={16} />Оплачено</> : <><Clock size={16} />Не оплачено</>}</span>
            <button onClick={toggle} disabled={pending} className="rounded-lg border border-current px-2 py-1 text-xs font-bold disabled:opacity-50">
                {pending ? '…' : paid ? 'Отменить оплату' : 'Отметить оплату'}
            </button>
        </div>
    )
}
