'use client'

import { useEffect, useState } from 'react'
import { UserRound, ExternalLink } from 'lucide-react'
import { ensureOwnerToken } from '@/app/actions'
import { MessageButtons } from './message-buttons'

// «Страница владельца»: секретная ссылка на всю историю машины + форма «что сделать на следующем ТО».
export function ShareOwnerPage({ carId, token: initial, phone, hello, car, tgCarId }: { carId: number; token: string | null; phone: string; hello: string; car: string; tgCarId?: number | null; voice?: boolean }) {
    const [token, setToken] = useState(initial)
    const [busy, setBusy] = useState(false)
    const [origin, setOrigin] = useState('https://garaggio.ru')
    useEffect(() => setOrigin(window.location.origin), [])
    const url = token ? `${origin}/c/${token}` : ''
    if (!token) {
        return (
            <button type="button" className="btn-ghost w-full" disabled={busy}
                onClick={async () => { setBusy(true); try { setToken(await ensureOwnerToken(carId)) } finally { setBusy(false) } }}>
                <UserRound size={20} />{busy ? 'Готовим…' : 'Страница владельца'}
            </button>
        )
    }
    const text = `${hello} Это Garaggio 🤌 Здесь вся история обслуживания вашей ${car}: что делали, отчёты с фото. Туда же можно написать, что сделать на следующем ТО — ${url}`
    return (
        <details className="fold">
            <summary className="fold-summary">👤 Страница владельца</summary>
            <div className="fold-body flex flex-col gap-3">
                <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm font-semibold text-gold"><ExternalLink size={16} />Открыть как клиент</a>
                <p className="text-sm font-bold">📤 Отправить ссылку клиенту — выберите, куда:</p>
                {/* голос тут не нужен: ссылку голосом не отправишь */}
                <MessageButtons phone={phone} templates={[{ id: 'owner', label: 'Ссылка', text }]} tgCarId={tgCarId} />
            </div>
        </details>
    )
}
