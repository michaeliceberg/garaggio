'use client'

import { useEffect, useState } from 'react'
import { Wrench, CalendarDays, User, CheckCircle2 } from 'lucide-react'
import { Section } from '@/components/form-section'
import { PhoneInput } from '@/components/phone-input'
import { PlateInput } from '@/components/plate-input'
import { book, getSlots } from './actions'

const fmt = (day: string, o: Intl.DateTimeFormatOptions) => new Date(day + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC', ...o })
const dur = (m: number) => (m % 60 ? `${Math.floor(m / 60) ? `${Math.floor(m / 60)},5 ч` : `${m} мин`}` : `${m / 60} ч`)

// Самозапись по шагам на одной странице: что сделать → день и время (только свободное) → кто вы → «Записаться».
export function BookingForm({ days, works }: { days: string[]; works: { id: string; label: string; minutes: number }[] }) {
    const [workId, setWorkId] = useState('to')
    const [comment, setComment] = useState('')
    const [day, setDay] = useState(days[0])
    const [slots, setSlots] = useState<string[] | null>(null)
    const [time, setTime] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [car, setCar] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)
    const work = works.find((w) => w.id === workId)!

    useEffect(() => {
        let stop = false
        setSlots(null); setTime(null)
        getSlots(day, workId).then((s) => { if (!stop) setSlots(s) })
        return () => { stop = true }
    }, [day, workId])

    if (done) {
        return (
            <section className="card flex flex-col items-center gap-3 p-6 text-center">
                <CheckCircle2 size={48} className="text-olive" />
                <h2 className="text-xl font-black">Заявка отправлена!</h2>
                <p className="text-muted">{fmt(day, { weekday: 'long', day: 'numeric', month: 'long' })}, {time}<br />Мастер подтвердит запись и напишет вам. Грацие! 🤌</p>
            </section>
        )
    }

    return (
        <form className="flex flex-col gap-3" onSubmit={async (e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            if (!time) { setError('Выберите время'); return }
            setBusy(true); setError(null)
            try {
                const r = await book({ day, time, workId, comment, name, car, phone: String(f.get('owner_phone') ?? ''), plate: String(f.get('plate') ?? ''), website: String(f.get('website') ?? '') })
                if ('error' in r && r.error) { setError(r.error); if (r.error.includes('заняли')) getSlots(day, workId).then(setSlots) }
                else setDone(true)
            } finally { setBusy(false) }
        }}>
            <Section icon={<Wrench size={18} />} title="Что нужно сделать" color="#8DB255">
                <div className="flex flex-wrap gap-1.5">
                    {works.map((w) => (
                        <button key={w.id} type="button" onClick={() => setWorkId(w.id)}
                            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${workId === w.id ? 'border-basil bg-basil text-white' : 'border-line text-muted'}`}>{w.label}</button>
                    ))}
                </div>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={300} className="input text-sm"
                    placeholder={workId === 'other' ? 'Что случилось с машиной?' : 'Комментарий (необязательно): стучит спереди справа…'} />
            </Section>

            <Section icon={<CalendarDays size={18} />} title="Когда удобно" color="#53ADEF">
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                    {days.map((d, i) => (
                        <button key={d} type="button" onClick={() => setDay(d)}
                            className={`flex min-w-[52px] flex-col items-center rounded-xl border py-1.5 text-xs font-semibold ${d === day ? 'border-basil bg-basil text-white' : 'border-line text-muted'}`}>
                            <span>{i === 0 ? 'Сег.' : i === 1 ? 'Завт.' : fmt(d, { weekday: 'short' })}</span>
                            <span className="text-lg font-black leading-tight">{fmt(d, { day: 'numeric' })}</span>
                        </button>
                    ))}
                </div>
                <div className="text-sm text-muted first-letter:uppercase">{fmt(day, { weekday: 'long', day: 'numeric', month: 'long' })} · займёт около {dur(work.minutes)}</div>
                {slots === null ? <p className="text-sm text-muted">Смотрим свободное время…</p>
                    : slots.length === 0 ? <p className="rounded-xl bg-bg p-3 text-sm text-muted">На этот день свободного времени нет — выберите другой.</p>
                        : (
                            <div className="grid grid-cols-4 gap-1.5">
                                {slots.map((t) => (
                                    <button key={t} type="button" onClick={() => { setTime(t); setError(null) }}
                                        className={`rounded-xl border py-2 text-sm font-bold ${time === t ? 'border-basil bg-basil text-white' : 'border-line'}`}>{t}</button>
                                ))}
                            </div>
                        )}
            </Section>

            <Section icon={<User size={18} />} title="Кто приедет" color="#F2C35B">
                <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0"><label className="label" htmlFor="bname">Имя</label><input id="bname" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="input" placeholder="Андрей" autoComplete="given-name" /></div>
                    <PhoneInput />
                </div>
                <div><label className="label" htmlFor="bcar">Машина</label><input id="bcar" value={car} onChange={(e) => setCar(e.target.value)} maxLength={60} className="input" placeholder="Toyota Camry" /></div>
                <PlateInput label="Госномер (если знаете)" />
                {/* ловушка для ботов — люди это поле не видят */}
                <input name="website" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden />
            </Section>

            {error && <p className="text-center font-semibold text-tomato">{error}</p>}
            <button className="btn-primary" disabled={busy}>
                {busy ? 'Отправляем…' : time ? `Записаться: ${fmt(day, { day: 'numeric', month: 'short' })}, ${time}` : 'Записаться'}
            </button>
            <p className="text-center text-xs text-muted">Нажимая «Записаться», вы соглашаетесь, что мастер свяжется с вами по этому номеру.</p>
        </form>
    )
}
