'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { tgToChat } from '@/app/actions'

// Ответ клиенту в Telegram из «Ящика».
export function TgReply({ chatId }: { chatId: string }) {
    const [text, setText] = useState('')
    const [busy, setBusy] = useState(false)
    const [err, setErr] = useState<string | null>(null)
    return (
        <form className="sticky bottom-24 flex flex-col gap-2 rounded-2xl border border-line bg-bg/95 p-2 backdrop-blur"
            onSubmit={async (e) => {
                e.preventDefault()
                if (!text.trim()) return
                setBusy(true); setErr(null)
                try { const r = await tgToChat(chatId, text); if ('error' in r && r.error) setErr(r.error); else setText('') }
                finally { setBusy(false) }
            }}>
            <div className="flex gap-2">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Ответить клиенту…" className="input flex-1 text-sm" />
                <button disabled={busy || !text.trim()} className="btn-primary !bg-[#2AABEE] px-4 !shadow-[0_3px_0_#1B7FB3]" aria-label="Отправить"><Send size={20} /></button>
            </div>
            {err && <p className="text-sm font-semibold text-tomato">{err}</p>}
        </form>
    )
}
