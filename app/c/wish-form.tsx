'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addWish } from './actions'
import { NumberedTextarea } from '@/components/numbered-textarea'
import { cleanItems, splitItems } from '@/lib/items'

const IDEAS = ['Поменять масло', 'Шиномонтаж', 'Посмотреть тормоза', 'Стучит/скрипит — проверить', 'Заменить дворники']

export function WishForm({ token }: { token: string }) {
    const router = useRouter()
    const [text, setText] = useState('')
    const [hp, setHp] = useState('')
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null)
    // кнопки-подсказки — как в визите: нажал — пункт добавился и кнопка подсветилась, нажал ещё раз — убрался
    const lines = splitItems(text)
    const has = (i: string) => lines.some((l) => l.toLowerCase() === i.toLowerCase())
    const toggle = (i: string) => setText((t) => {
        const ls = splitItems(t)
        return (ls.some((l) => l.toLowerCase() === i.toLowerCase()) ? ls.filter((l) => l.toLowerCase() !== i.toLowerCase()) : [...ls, i]).join('\n')
    })
    const send = async () => {
        setBusy(true); setMsg(null)
        const r = await addWish(token, cleanItems(text), hp)
        setBusy(false)
        if ('error' in r && r.error) setMsg({ text: r.error })
        else { setText(''); setMsg({ ok: true, text: 'Записали! Маэстро увидит 🤌' }); router.refresh() }
    }
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
                {IDEAS.map((i) => (
                    <button key={i} type="button" onClick={() => toggle(i)} aria-pressed={has(i)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${has(i) ? 'border-olive bg-olive/20 text-olive' : 'border-line text-white/85'}`}>
                        {has(i) ? '✓ ' : '+ '}{i}
                    </button>
                ))}
            </div>
            <NumberedTextarea value={text} onChange={setText} rows={3}
                placeholder="Например: заменить колодки. Посмотреть, почему горит check engine — каждый пункт с новой строки или через точку" />
            <input value={hp} onChange={(e) => setHp(e.target.value)} name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            {msg && <p className={`text-sm font-semibold ${msg.ok ? 'text-olive' : 'text-tomato'}`}>{msg.text}</p>}
            <button type="button" className="btn-primary" disabled={busy || !text.trim()} onClick={send}>{busy ? 'Отправляем…' : 'Отправить Маэстро'}</button>
            <p className="text-center text-xs text-muted">Время приезда согласуем по телефону 📞</p>
        </div>
    )
}
