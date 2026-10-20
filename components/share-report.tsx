'use client'

import { useEffect, useState } from 'react'
import { FileText, ExternalLink } from 'lucide-react'
import { ensureShareToken } from '@/app/actions'
import { MessageButtons } from './message-buttons'

// «Отчёт клиенту»: делаем секретную ссылку и сразу даём отправить её любым мессенджером.
export function ShareReport({ visitId, token: initial, phone, hello, car, tgCarId, voice }: { visitId: number; token: string | null; phone: string; hello: string; car: string; tgCarId?: number | null; voice?: boolean }) {
    const [token, setToken] = useState(initial)
    const [busy, setBusy] = useState(false)
    // адрес сайта берём в браузере (на сервере window нет)
    const [origin, setOrigin] = useState('https://garaggio.ru')
    useEffect(() => setOrigin(window.location.origin), [])
    const url = token ? `${origin}/r/${token}` : ''
    if (!token) {
        return (
            <button type="button" className="btn-ghost w-full" disabled={busy}
                onClick={async () => { setBusy(true); try { setToken(await ensureShareToken(visitId)) } finally { setBusy(false) } }}>
                <FileText size={20} />{busy ? 'Готовим…' : 'Отчёт клиенту'}
            </button>
        )
    }
    const text = `${hello} Это Garaggio 🤌 Вот отчёт о визите (${car}): что сделали и фото — ${url}`
    return (
        <div className="card flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
                <span className="font-black">Отчёт клиенту</span>
                <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-semibold text-gold"><ExternalLink size={16} />Открыть</a>
            </div>
            {phone || tgCarId ? <MessageButtons phone={phone} templates={[{ id: 'report', label: 'Отчёт', text }]} tgCarId={tgCarId} voice={voice} /> : <p className="break-all text-sm text-muted">{url}</p>}
        </div>
    )
}
