'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Share2, Check, PackageCheck } from 'lucide-react'
import type { OrderCard } from '@/lib/order'
import { setPartsOrdered } from '@/app/actions'
import { PlateBadge } from './plate'
import { NumberedText } from './numbered-text'

const dayRu = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'long' })
const SOURCE = { car: '', other: 'как у другой машины — проверить', none: 'раньше не записывали' }

export function OrderList({ cards }: { cards: OrderCard[] }) {
    // по умолчанию отмечено всё, кроме записей, где детали уже заказаны
    const [checked, setChecked] = useState<Set<string>>(() => new Set(cards.filter((c) => !c.appt.parts_ordered).flatMap((c) => c.items.map((i) => i.key))))
    const [ordered, setOrdered] = useState<Record<number, boolean>>(() => Object.fromEntries(cards.map((c) => [c.appt.id, c.appt.parts_ordered])))
    const [note, setNote] = useState<string | null>(null)
    const toggle = (k: string) => setChecked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
    const total = cards.reduce((s, c) => s + c.items.filter((i) => checked.has(i.key)).length, 0)
    const text = () => {
        const parts = cards.map((c) => {
            const lines = c.items.filter((i) => checked.has(i.key)).map((i) => `• ${i.name}${i.article ? ` — ${i.article}` : ''}`)
            if (!lines.length) return ''
            return `🚗 ${[c.car.brand, c.car.model].filter(Boolean).join(' ')} ${c.car.plate} — ${dayRu(c.appt.day)}\n${lines.join('\n')}`
        }).filter(Boolean)
        return `Заказ к ТО:\n\n${parts.join('\n\n')}`
    }
    const flash = (s: string) => { setNote(s); setTimeout(() => setNote(null), 2500) }
    const copy = async () => { try { await navigator.clipboard.writeText(text()); flash('Скопировано ✅') } catch { flash('Не получилось скопировать') } }
    const share = async () => { if (navigator.share) { try { await navigator.share({ text: text() }) } catch { /* закрыли меню */ } } else copy() }
    const markOrdered = async (id: number) => {
        const v = !ordered[id]
        setOrdered((o) => ({ ...o, [id]: v }))
        if (v) setChecked((s) => { const n = new Set(s); cards.find((c) => c.appt.id === id)?.items.forEach((i) => n.delete(i.key)); return n })
        await setPartsOrdered(id, v)
    }
    return (
        <div className="flex flex-col gap-3 pb-24">
            {cards.map((c) => (
                <section key={c.appt.id} className={`card flex flex-col gap-3 p-4 ${ordered[c.appt.id] ? 'opacity-70' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                        <Link href={`/cars/${c.car.id}`} className="flex min-w-0 flex-col gap-1">
                            <span className="flex items-center gap-2"><PlateBadge plate={c.car.plate} /><b className="truncate">{[c.car.brand, c.car.model].filter(Boolean).join(' ')}</b></span>
                            <span className="text-sm text-muted">{dayRu(c.appt.day)}, {c.appt.start_time}{c.car.owner_name ? ` · ${c.car.owner_name}` : ''}{c.appt.status === 'pending' ? ' · заявка' : ''}</span>
                        </Link>
                        <button type="button" onClick={() => markOrdered(c.appt.id)}
                            className={`flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${ordered[c.appt.id] ? 'border-basil bg-basil/20 text-olive' : 'border-line text-muted'}`}>
                            <PackageCheck size={14} />{ordered[c.appt.id] ? 'Заказано' : 'Отметить заказано'}
                        </button>
                    </div>
                    {c.appt.work && <p className="text-sm text-muted">📅 В записи: {c.appt.work.split('\n').filter(Boolean).join(', ')}</p>}
                    {c.fromLastVisit && <p className="text-xs text-muted">Работы — как на прошлом ТО ({new Date(c.fromLastVisit + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })})</p>}
                    {c.items.length > 0 ? (
                        <ul className="flex flex-col gap-1.5">
                            {c.items.map((i) => (
                                <li key={i.key}>
                                    <button type="button" onClick={() => toggle(i.key)} className="flex w-full items-start gap-3 rounded-xl bg-bg p-3 text-left">
                                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${checked.has(i.key) ? 'border-basil bg-basil text-white' : 'border-line'}`}>{checked.has(i.key) && <Check size={14} />}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className={`block ${i.source === 'none' ? 'text-gold' : ''}`}>{i.name}</span>
                                            <span className="block text-xs text-muted">{[i.article, SOURCE[i.source]].filter(Boolean).join(' · ')}</span>
                                            {i.stockText && <span className={`block text-xs font-semibold ${i.need && parseFloat(i.stockText.replace(',', '.')) < i.need ? 'text-tomato' : 'text-olive'}`}>📦 На складе {i.stockText}{i.need ? ` · нужно ${String(i.need).replace('.', ',')}` : ''}</span>}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-muted">По записи заказывать нечего (шиномонтаж, диагностика…).</p>}
                    {c.unknown.length > 0 && <p className="rounded-xl bg-gold/10 p-3 text-sm text-gold">❓ Уточнить: {c.unknown.join(', ')}</p>}
                    {c.wishes.length > 0 && <p className="rounded-xl bg-gold/10 p-3 text-sm"><b className="text-gold">📝 Клиент хочет:</b> {c.wishes.join('; ')}</p>}
                    {c.recommendations && <div className="rounded-xl bg-bg p-3 text-sm"><b>Рекомендации прошлого визита</b><NumberedText text={c.recommendations} className="mt-1" /></div>}
                </section>
            ))}
            <div className="fixed inset-x-0 bottom-24 z-10 mx-auto flex max-w-2xl flex-col gap-1 px-4">
                {note && <p className="rounded-xl bg-card p-2 text-center text-sm font-semibold">{note}</p>}
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="btn-primary" disabled={!total} onClick={share}><Share2 size={20} />Отправить ({total})</button>
                    <button type="button" className="btn-ghost bg-card" disabled={!total} onClick={copy}><Copy size={20} />Скопировать</button>
                </div>
            </div>
        </div>
    )
}
