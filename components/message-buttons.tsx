'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Send, Copy, MessageSquareText, Check, Bot } from 'lucide-react'
import { tgToCar } from '@/app/actions'
import { phoneDigits, type MsgTemplate } from '@/lib/messages'

// Написать клиенту: WhatsApp и SMS открываются сразу с текстом; в Telegram текст подставить нельзя —
// копируем его и открываем чат, остаётся вставить. «Скопировать» — для Max и всего остального.
// tgCarId — клиент подписан на бота: главная кнопка отправляет текст сразу, без переключения в мессенджер.
export function MessageButtons({ phone, templates, tgCarId }: { phone: string; templates: MsgTemplate[]; tgCarId?: number | null }) {
    const [sending, setSending] = useState(false)
    const [tpl, setTpl] = useState(templates[0].id)
    const [text, setText] = useState(templates[0].text)
    const [note, setNote] = useState<string | null>(null)
    const d = phoneDigits(phone)
    const flash = (s: string) => { setNote(s); setTimeout(() => setNote(null), 2500) }
    const copy = async () => { try { await navigator.clipboard.writeText(text); return true } catch { return false } }
    // айфону нужен «&body=», остальным «?body=» — определяем после загрузки (на сервере браузера нет)
    const [isIOS, setIsIOS] = useState(false)
    useEffect(() => setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent)), [])
    const btn = 'flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold active:translate-y-[1px]'
    return (
        <div className="flex flex-col gap-2">
            {templates.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                    {templates.map((t) => (
                        <button key={t.id} type="button" onClick={() => { setTpl(t.id); setText(t.text) }}
                            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${tpl === t.id ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
            )}
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="input text-sm" />
            {tgCarId && (
                <button type="button" disabled={sending} className="btn-primary w-full !bg-[#2AABEE] !shadow-[0_3px_0_#1B7FB3]"
                    onClick={async () => {
                        setSending(true)
                        try { const r = await tgToCar(tgCarId, text); flash('error' in r && r.error ? r.error : 'Отправлено в Telegram ✅') }
                        finally { setSending(false) }
                    }}>
                    <Bot size={20} />{sending ? 'Отправляем…' : 'Отправить через бот Garaggio'}
                </button>
            )}
            {phone && <div className="grid grid-cols-2 gap-2">
                <a href={`https://wa.me/${d}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className={`${btn} border-[#25D366]/50 text-[#25D366]`}>
                    <MessageCircle size={18} />WhatsApp
                </a>
                <button type="button" className={`${btn} border-[#2AABEE]/50 text-[#2AABEE]`}
                    onClick={async () => { const ok = await copy(); window.open(`https://t.me/+${d}`, '_blank'); flash(ok ? 'Текст скопирован — вставьте в чат' : 'Откройте чат и напишите') }}>
                    <Send size={18} />Telegram
                </button>
                <a href={`sms:+${d}${isIOS ? '&' : '?'}body=${encodeURIComponent(text)}`} className={`${btn} border-line text-white`}>
                    <MessageSquareText size={18} />SMS
                </a>
                <button type="button" className={`${btn} border-line text-white`} onClick={async () => flash((await copy()) ? 'Скопировано — вставьте в Max или куда удобно' : 'Не получилось скопировать')}>
                    {note ? <Check size={18} /> : <Copy size={18} />}Скопировать
                </button>
            </div>}
            {note && <p className="text-center text-sm font-semibold text-olive">{note}</p>}
        </div>
    )
}
