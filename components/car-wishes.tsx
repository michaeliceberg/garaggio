'use client'

import { useState } from 'react'
import { Check, Undo2 } from 'lucide-react'
import { setWishDone } from '@/app/actions'
import { NumberedText } from '@/components/numbered-text'

type W = { id: number; text: string; done: boolean; created_at: string }

// Пожелания владельца к следующему ТО (пишет на своей странице). Мастер отмечает «Учтено» — клиент это видит.
export function CarWishes({ wishes }: { wishes: W[] }) {
    const [list, setList] = useState(wishes)
    if (list.length === 0) return null
    const toggle = async (w: W) => {
        setList((l) => l.map((x) => (x.id === w.id ? { ...x, done: !x.done } : x)))
        await setWishDone(w.id, !w.done)
    }
    const open = list.filter((w) => !w.done)
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-gold/40 bg-gold/[0.07] p-3">
            <div className="text-sm font-black text-gold">📝 Клиент хочет на следующем ТО{open.length ? ` · ${open.length}` : ''}</div>
            {list.slice(0, 6).map((w) => (
                <div key={w.id} className={`flex items-start justify-between gap-2 text-sm ${w.done ? 'opacity-50' : ''}`}>
                    <div>
                        <span className="text-xs text-muted">{new Date(w.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} · </span>
                        <NumberedText text={w.text} className={w.done ? 'line-through' : ''} />
                    </div>
                    <button type="button" onClick={() => toggle(w)} className="flex shrink-0 items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-bold text-muted">
                        {w.done ? <><Undo2 size={14} />Вернуть</> : <><Check size={14} />Учтено</>}
                    </button>
                </div>
            ))}
        </div>
    )
}
