'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Send, Copy, MessageSquareText, Check, Bot, Mic, Share2, Sparkles } from 'lucide-react'
import { tgToCar, tgVoiceToCar } from '@/app/actions'
import { phoneDigits, type MsgTemplate } from '@/lib/messages'

// Связаться с клиентом: WhatsApp и SMS открываются сразу с текстом; в Telegram текст подставить нельзя —
// копируем его и открываем чат, остаётся вставить. «Скопировать» — для Max и всего остального.
// tgCarId — клиент подписан на бота: главная кнопка отправляет текст сразу, без переключения в мессенджер.
// voice — тот же текст голосом Chuck Miller: «Послушать» есть всегда; подписанному на бота — «Голосовое через бот»,
// остальным — «Поделиться голосовым» (файл уходит в WhatsApp/Telegram через меню телефона).
export function MessageButtons({ phone, templates, tgCarId, voice }: { phone: string; templates: MsgTemplate[]; tgCarId?: number | null; voice?: boolean }) {
    const [sending, setSending] = useState<'text' | 'voice' | 'preview' | null>(null)
    const [player, setPlayer] = useState<HTMLAudioElement | null>(null)
    // последнее озвученное: «Поделиться» после «Послушать» берёт готовый файл сразу (телефон разрешает меню
    // «Поделиться» только сразу после нажатия, долгого ожидания озвучки оно не переживает)
    const [last, setLast] = useState<{ text: string; blob: Blob } | null>(null)
    const stop = () => { player?.pause(); setPlayer(null) }
    const audioFor = async (t: string) => {
        if (last?.text === t) return last.blob
        const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t }) })
        if (!r.ok) throw new Error(r.status === 502 ? await r.text() : 'Не получилось озвучить')
        const blob = await r.blob()
        setLast({ text: t, blob })
        return blob
    }
    const preview = async () => {
        if (player) return stop()
        setSending('preview')
        try {
            const a = new Audio(URL.createObjectURL(await audioFor(text)))
            a.onended = () => setPlayer(null)
            setPlayer(a); await a.play()
        } catch (e) { flash((e as Error).message) } finally { setSending(null) }
    }
    const shareVoice = async () => {
        const fresh = last?.text !== text
        setSending('voice')
        try {
            const file = new File([await audioFor(text)], 'Garaggio.mp3', { type: 'audio/mpeg' })
            if (navigator.canShare?.({ files: [file] })) {
                try { await navigator.share({ files: [file] }) } catch (e) {
                    if ((e as Error).name === 'NotAllowedError' && fresh) flash('Голосовое готово — нажмите «Поделиться» ещё раз')
                }
            } else {
                const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click()
                flash('Файл скачан — отправьте его клиенту')
            }
        } catch (e) { flash((e as Error).message) } finally { setSending(null) }
    }
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
                <button type="button" disabled={!!sending} className="btn-primary w-full !bg-[#2AABEE] !shadow-[0_3px_0_#1B7FB3]"
                    onClick={async () => {
                        setSending('text')
                        try { const r = await tgToCar(tgCarId, text); flash('error' in r && r.error ? r.error : 'Отправлено в Telegram ✅') }
                        finally { setSending(null) }
                    }}>
                    <Bot size={20} />{sending === 'text' ? 'Отправляем…' : 'Отправить через бот Garaggio'}
                </button>
            )}
            {voice && (
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={sending === 'voice' || sending === 'preview'} onClick={preview}
                        className="btn-magic" data-state={sending === 'preview' ? 'busy' : player ? 'playing' : 'idle'} aria-label="Послушать голосом">
                        {[18, 42, 66, 86].map((left, i) => <span key={left} className="magic-spark" style={{ left: `${left}%`, animationDelay: `${i * 0.45}s` }} />)}
                        {player
                            ? <span className="magic-bars" aria-hidden><i /><i /><i /><i /></span>
                            : <Sparkles size={20} className="magic-icon" />}
                        {sending === 'preview' ? 'Колдуем…' : player ? 'Стоп' : 'Послушать'}
                    </button>
                    {tgCarId ? (
                        <button type="button" disabled={!!sending} className={`${btn} border-[#2AABEE]/50 text-[#2AABEE]`}
                            onClick={async () => {
                                setSending('voice')
                                try { const r = await tgVoiceToCar(tgCarId, text); flash('error' in r && r.error ? r.error : 'Голосовое отправлено 🔊') }
                                finally { setSending(null) }
                            }}>
                            <Mic size={18} />{sending === 'voice' ? 'Озвучиваем и отправляем…' : 'Голосовое через бот'}
                        </button>
                    ) : (
                        <button type="button" disabled={!!sending} onClick={shareVoice} className={`${btn} border-[#2AABEE]/50 text-[#2AABEE]`}>
                            <Share2 size={18} />{sending === 'voice' ? 'Озвучиваем…' : 'Поделиться голосовым'}
                        </button>
                    )}
                </div>
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
            {!phone && !tgCarId && (
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" className={`${btn} border-line text-white`} onClick={async () => flash((await copy()) ? 'Скопировано — вставьте в чат' : 'Не получилось скопировать')}>
                        <Copy size={18} />Скопировать
                    </button>
                    <button type="button" className={`${btn} border-[#2AABEE]/50 text-[#2AABEE]`}
                        onClick={async () => { if (navigator.share) { try { await navigator.share({ text }) } catch { /* закрыли меню */ } } else flash((await copy()) ? 'Скопировано — вставьте в чат' : 'Не получилось скопировать') }}>
                        <Share2 size={18} />Поделиться
                    </button>
                </div>
            )}
            {note && <p className="text-center text-sm font-semibold text-olive">{note}</p>}
        </div>
    )
}
