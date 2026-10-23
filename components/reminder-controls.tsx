'use client'

import { useState, useTransition } from 'react'
import { Send, Eye } from 'lucide-react'
import { sendReminderSample, sendRemindersNow, toggleReminder } from '@/app/actions'

// Включатели напоминаний + «Прислать пример мне» + «Отправить сейчас»
export function ReminderControls({ settings, pending }: { settings: { appt: boolean; due: boolean }; pending: number }) {
    const [on, setOn] = useState(settings)
    const [busy, start] = useTransition()
    const [note, setNote] = useState<string | null>(null)
    const flip = (kind: 'appt' | 'due') => { const v = !on[kind]; setOn({ ...on, [kind]: v }); start(() => toggleReminder(kind, v)) }
    const Row = ({ kind, title, hint }: { kind: 'appt' | 'due'; title: string; hint: string }) => (
        <button type="button" onClick={() => flip(kind)} className="flex w-full items-center gap-3 rounded-xl bg-bg p-3 text-left" role="switch" aria-checked={on[kind]}>
            <span className="min-w-0 flex-1"><b className="block">{title}</b><span className="block text-xs text-muted">{hint}</span></span>
            <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on[kind] ? 'bg-basil' : 'bg-line'}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on[kind] ? 'left-6' : 'left-1'}`} />
            </span>
        </button>
    )
    return (
        <section className="card flex flex-col gap-2 p-4">
            <Row kind="appt" title="📅 Накануне записи" hint="«Завтра в 10:00 ждём вас. Всё в силе?» — кнопки «Приеду» / «Перенести»" />
            <Row kind="due" title="🔧 Пора на ТО" hint="по сроку или пробегу из прошлого визита + кнопка записи; через 2 недели — ещё раз" />
            <div className="mt-1 grid grid-cols-2 gap-2">
                <button type="button" className="btn-ghost px-3 text-sm" disabled={busy} onClick={() => start(async () => { setNote(await sendReminderSample() ?? 'Пример отправлен вам в Telegram 👀') })}><Eye size={18} />Пример мне</button>
                <button type="button" className="btn-primary px-3 text-sm" disabled={busy || !pending || (!on.appt && !on.due)}
                    onClick={() => start(async () => { const r = await sendRemindersNow(); setNote(r.sent ? `Отправлено: ${r.sent}` : r.failed ? 'Не отправилось — проверьте Telegram' : 'Нечего отправлять') })}><Send size={18} />Отправить сейчас</button>
            </div>
            {note && <p className="text-sm font-semibold text-olive">{note}</p>}
        </section>
    )
}
