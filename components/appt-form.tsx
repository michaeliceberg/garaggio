'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, UserPlus, AlertTriangle, User, Clock, Wrench } from 'lucide-react'
import { saveAppt } from '@/app/actions'
import { normPlate, workPresets, POWERTRAIN_LABEL, POWERTRAINS, type Powertrain } from '@/lib/format'
import { PlateBadge } from './plate'
import { PhoneInput } from './phone-input'
import { Section } from './form-section'

type CarLite = { id: number; plate: string; brand: string; model: string; owner_name: string; owner_phone: string; powertrain: Powertrain }
type Initial = { id?: number; car_id: number | null; client_name: string; client_phone: string; day: string; start_time: string; duration_min: number; work: string }

const DURATIONS = [[30, '30 мин'], [60, '1 час'], [90, '1,5 ч'], [120, '2 часа'], [180, '3 часа'], [240, '4 часа'], [480, 'Весь день']] as const
const TIMES = Array.from({ length: 28 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`) // 08:00–21:30, Маэстро работает 8–22

// Запись в календарь: машина из базы (поиск по номеру/имени/марке) или новый клиент (имя + телефон),
// день, время кнопками, длительность, что делать. Если время занято — показываем с кем и спрашиваем.
export function ApptForm({ cars, initial }: { cars: CarLite[]; initial: Initial }) {
    const router = useRouter()
    const [carId, setCarId] = useState<number | null>(initial.car_id)
    const [newClient, setNewClient] = useState(!initial.car_id && !!(initial.client_name || initial.client_phone))
    const [q, setQ] = useState('')
    const [name, setName] = useState(initial.client_name)
    const [day, setDay] = useState(initial.day)
    const [time, setTime] = useState(initial.start_time)
    const [duration, setDuration] = useState(initial.duration_min)
    const [work, setWork] = useState(initial.work)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [clash, setClash] = useState<string[] | null>(null)
    const car = cars.find((c) => c.id === carId)
    // Работы — те же кнопки, что в визите: свои для ДВС / гибрида / электро + общие (шины по сезону, тормоза…).
    // Пишем полным текстом по строке — потом «Начать визит» подставит их в визит, и там они уже будут отмечены.
    const [ptNew, setPtNew] = useState<Powertrain>('ice')
    const pt = car?.powertrain ?? ptNew
    const presets = workPresets(pt)
    const lines = work.split('\n').map((l) => l.trim()).filter(Boolean)
    const toggleWork = (t: string) => setWork((prev) => {
        const ls = prev.split('\n').map((l) => l.trim()).filter(Boolean)
        return (ls.includes(t) ? ls.filter((l) => l !== t) : [...ls, t]).join('\n')
    })
    const chip = (t: string, label: string) => (
        <button key={t} type="button" onClick={() => toggleWork(t)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${lines.includes(t) ? 'border-basil bg-basil text-white' : 'border-line text-muted'}`}>{label}</button>
    )
    const found = useMemo(() => {
        const s = q.trim().toLowerCase()
        if (!s) return []
        const p = normPlate(s), digits = s.replace(/\D/g, '')
        return cars.filter((c) => normPlate(c.plate).includes(p) || `${c.brand} ${c.model} ${c.owner_name}`.toLowerCase().includes(s)
            || (digits.length >= 3 && c.owner_phone.replace(/\D/g, '').includes(digits))).slice(0, 6)
    }, [q, cars])

    // телефон в подсказке: найденные цифры подсвечены («+7 916 099 19 97» при поиске «916»)
    const phoneHit = (phone: string) => {
        const digits = q.replace(/\D/g, '')
        if (digits.length < 3) return phone
        const all = phone.replace(/\D/g, ''), at = all.indexOf(digits)
        if (at < 0) return phone
        let n = 0
        return [...phone].map((ch, i) => {
            const isD = /\d/.test(ch), idx = isD ? n++ : -1
            return <span key={i} className={isD && idx >= at && idx < at + digits.length ? 'font-bold text-gold' : ''}>{ch}</span>
        })
    }
    async function submit(force = false, phone = '') {
        setBusy(true); setError(null)
        try {
            const r = await saveAppt({ id: initial.id, car_id: carId, client_name: name, client_phone: phone, day, start_time: time, duration_min: duration, work, force })
            if ('conflicts' in r && r.conflicts) { setClash(r.conflicts); return }
            if ('error' in r && r.error) { setError(r.error); return }
            router.push(`/calendar?d=${day}`); router.refresh()
        } finally { setBusy(false) }
    }

    return (
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); submit(false, String(new FormData(e.currentTarget).get('owner_phone') ?? '')) }}>
            <Section icon={<User size={18} />} title="Кто приедет" color="#F2C35B">
                {car ? (
                    <div className="flex items-center gap-3 rounded-xl border border-basil/60 bg-basil/10 p-3">
                        <PlateBadge plate={car.plate} />
                        <div className="min-w-0 flex-1">
                            <div className="truncate font-bold">{[car.brand, car.model].filter(Boolean).join(' ') || 'Машина'}</div>
                            <div className="truncate text-sm text-muted">{[car.owner_name, car.owner_phone].filter(Boolean).join(' · ')}</div>
                        </div>
                        <button type="button" onClick={() => { setCarId(null); setQ('') }} className="text-muted" aria-label="Выбрать другую машину"><X size={20} /></button>
                    </div>
                ) : newClient ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="label" htmlFor="client_name">Имя</label><input id="client_name" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Андрей" /></div>
                            <PhoneInput defaultValue={initial.client_phone} />
                        </div>
                        <button type="button" onClick={() => setNewClient(false)} className="self-start text-sm font-semibold text-gold">← Найти машину в базе</button>
                    </div>
                ) : (
                    <>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Номер, имя, телефон или марка" className="input pl-10" autoComplete="off" autoFocus />
                        </div>
                        {found.map((c) => (
                            <button key={c.id} type="button" onClick={() => setCarId(c.id)} className="flex items-center gap-3 rounded-xl border border-line p-2.5 text-left active:bg-card">
                                <PlateBadge plate={c.plate} />
                                <span className="min-w-0 flex-1 text-sm">
                                    <span className="block truncate"><b>{[c.brand, c.model].filter(Boolean).join(' ')}</b> {c.owner_name && <span className="text-muted">· {c.owner_name}</span>}</span>
                                    {c.owner_phone && <span className="block truncate text-xs text-muted">{phoneHit(c.owner_phone)}</span>}
                                </span>
                            </button>
                        ))}
                        {q && found.length === 0 && <p className="text-sm text-muted">Не нашлось.</p>}
                        <button type="button" onClick={() => setNewClient(true)} className="btn-ghost min-h-[44px] text-sm"><UserPlus size={18} />Новый клиент (машины ещё нет в базе)</button>
                    </>
                )}
            </Section>

            <Section icon={<Clock size={18} />} title="Когда" color="#53ADEF">
            <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0"><label className="label" htmlFor="day">День</label><input id="day" type="date" value={day} onChange={(e) => setDay(e.target.value)} className="input" required /></div>
                <div className="min-w-0"><label className="label" htmlFor="time">Время</label><input id="time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} className="input" required /></div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                {TIMES.map((t) => (
                    <button key={t} type="button" onClick={() => setTime(t)}
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${time === t ? 'border-basil bg-basil text-white' : 'border-line text-muted'}`}>{t}</button>
                ))}
            </div>
            <div className="border-t border-line pt-3">
                <span className="label">Сколько займёт</span>
                <div className="flex flex-wrap gap-1.5">
                    {DURATIONS.map(([m, l]) => (
                        <button key={m} type="button" onClick={() => setDuration(m)}
                            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${duration === m ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'}`}>{l}</button>
                    ))}
                </div>
            </div>
            </Section>

            <Section icon={<Wrench size={18} />} title="Что делать" color="#8DB255">
                {!car && (
                    <div className="flex gap-1.5">
                        {POWERTRAINS.map((p) => (
                            <button key={p} type="button" onClick={() => setPtNew(p)}
                                className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${ptNew === p ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'}`}>{POWERTRAIN_LABEL[p]}</button>
                        ))}
                    </div>
                )}
                <div className="-mb-1.5 flex flex-wrap gap-1.5">
                    {chip('Плановое ТО', 'ТО')}
                    {presets.own.map((p) => chip(p.text, p.label))}
                </div>
                <div className="flex flex-wrap gap-1.5">{presets.common.map((p) => chip(p.text, p.label))}</div>
                <textarea id="work" aria-label="Что делать" value={work} onChange={(e) => setWork(e.target.value)} rows={3} className="input" placeholder="Своими словами: стучит спереди справа…" />
            </Section>

            {clash && (
                <div className="flex flex-col gap-2 rounded-xl border border-gold/50 bg-gold/10 p-3 text-sm">
                    <div className="flex items-center gap-2 font-bold text-gold"><AlertTriangle size={18} />В это время уже записаны:</div>
                    <ul className="list-inside list-disc">{clash.map((c) => <li key={c}>{c}</li>)}</ul>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setClash(null)} className="btn-ghost min-h-[44px] text-sm">Другое время</button>
                        <button type="button" disabled={busy} className="btn-primary min-h-[44px] text-sm"
                            onClick={(e) => submit(true, String(new FormData(e.currentTarget.form!).get('owner_phone') ?? ''))}>Всё равно</button>
                    </div>
                </div>
            )}
            {error && <p className="font-semibold text-tomato">{error}</p>}
            {!clash && <button className="btn-primary" disabled={busy}>{busy ? 'Сохраняем…' : initial.id ? 'Сохранить запись' : 'Записать'}</button>}
        </form>
    )
}
