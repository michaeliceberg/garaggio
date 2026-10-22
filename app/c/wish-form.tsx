'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addWish } from './actions'

const IDEAS = ['Поменять масло', 'Шиномонтаж', 'Посмотреть тормоза', 'Стучит/скрипит — проверить', 'Заменить дворники']

export function WishForm({ token }: { token: string }) {
    const router = useRouter()
    const [text, setText] = useState('')
    const [hp, setHp] = useState('')
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null)
    const send = async () => {
        setBusy(true); setMsg(null)
        const r = await addWish(token, text, hp)
        setBusy(false)
        if ('error' in r && r.error) setMsg({ text: r.error })
        else { setText(''); setMsg({ ok: true, text: 'Записали! Маэстро увидит 🤌' }); router.refresh() }
    }
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
                {IDEAS.map((i) => (
                    <button key={i} type="button" onClick={() => setText((t) => (t.trim() ? `${t.trim()}, ${i.toLowerCase()}` : i))}
                        className="rounded-full border border-line px-3 py-1.5 text-sm text-muted">+ {i}</button>
                ))}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500} className="input"
                placeholder="Например: заменить колодки, посмотреть, почему горит check engine…" />
            <input value={hp} onChange={(e) => setHp(e.target.value)} name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            {msg && <p className={`text-sm font-semibold ${msg.ok ? 'text-olive' : 'text-tomato'}`}>{msg.text}</p>}
            <button type="button" className="btn-primary" disabled={busy || !text.trim()} onClick={send}>{busy ? 'Отправляем…' : 'Отправить Маэстро'}</button>
            <p className="text-center text-xs text-muted">Время приезда согласуем по телефону 📞</p>
        </div>
    )
}
