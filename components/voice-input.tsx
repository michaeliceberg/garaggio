'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { parseVoice } from '@/app/actions'
import type { VoiceParsed } from '@/lib/ai'

// «Надиктовать»: речь распознаёт сам телефон (Web Speech API), текст разбирает нейросеть на сервере.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = any
export function VoiceInput({ carId, onResult }: { carId: number; onResult: (parsed: VoiceParsed | null, text: string) => void }) {
    const [supported, setSupported] = useState(true)
    const [state, setState] = useState<'idle' | 'listening' | 'thinking'>('idle')
    const [live, setLive] = useState('')
    const [hint, setHint] = useState<string | null>(null)
    const rec = useRef<Rec>(null)
    const finalText = useRef('')

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any
        if (!(w.SpeechRecognition || w.webkitSpeechRecognition)) setSupported(false)
    }, [])

    const start = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any
        const SR = w.SpeechRecognition || w.webkitSpeechRecognition
        if (!SR) { setSupported(false); return }
        const r: Rec = new SR()
        r.lang = 'ru-RU'
        r.continuous = true
        r.interimResults = true
        finalText.current = ''
        r.onresult = (e: Rec) => {
            let interim = ''
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript
                if (e.results[i].isFinal) finalText.current += t + ' '
                else interim += t
            }
            setLive((finalText.current + interim).trim())
        }
        r.onerror = (e: Rec) => { setHint(e.error === 'not-allowed' ? 'Разрешите доступ к микрофону в настройках браузера' : 'Не расслышал — попробуйте ещё раз'); setState('idle') }
        r.onend = () => { if (rec.current === r) finish() }
        rec.current = r
        setLive(''); setHint(null); setState('listening')
        r.start()
    }
    const finish = async () => {
        const r = rec.current
        rec.current = null
        try { r?.stop() } catch { /* уже остановлен */ }
        const text = (finalText.current || live).trim()
        if (!text) { setState('idle'); return }
        setState('thinking')
        const parsed = await parseVoice(text, carId).catch(() => null)
        onResult(parsed, text)
        setHint(parsed ? 'Разложил по полям — проверьте 👌' : 'Вставил текст в «Что сделали»')
        setLive(''); setState('idle')
    }

    if (!supported) {
        return <p className="rounded-xl bg-bg p-3 text-sm text-muted">🎤 Диктовка здесь недоступна — нажмите на поле «Что сделали» и используйте микрофон на клавиатуре.</p>
    }
    return (
        <div className="flex flex-col gap-2">
            {state === 'listening' ? (
                <button type="button" onClick={finish} className="btn w-full animate-pulse bg-tomato text-white"><Square size={18} />Готово — разобрать</button>
            ) : (
                <button type="button" onClick={start} disabled={state === 'thinking'} className="btn w-full border border-tomato/50 bg-tomato/10 text-tomato">
                    {state === 'thinking' ? <><Loader2 size={18} className="animate-spin" />Раскладываю по полям…</> : <><Mic size={18} />Надиктовать</>}
                </button>
            )}
            {state === 'listening' && <p className="min-h-[2.5rem] rounded-xl bg-bg p-3 text-sm">{live || 'Говорите: «Поменял масло Шелл пять-тридцать, четыре литра, фильтр Манн, работа две тысячи»…'}</p>}
            {hint && state === 'idle' && <p className="text-sm font-semibold text-olive">{hint}</p>}
        </div>
    )
}
