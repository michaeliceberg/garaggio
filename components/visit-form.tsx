'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, CalendarDays, CalendarClock, Wrench, Camera, MessageSquare } from 'lucide-react'
import { saveVisit } from '@/app/actions'
import type { Visit } from '@/lib/data'
import { DEFAULT_INTERVAL_KM, DEFAULT_INTERVAL_MONTHS, partsTotal, rub, toISODate, workPresets, type Part, type Powertrain, type WorkPreset } from '@/lib/format'
import { compressPhoto, uploadPhoto } from '@/lib/photo-client'
import { PhotoPicker, type PendingPhoto } from './photo-picker'
import { VoiceInput } from './voice-input'
import type { VoiceParsed } from '@/lib/ai'

const addMonths = (iso: string, m: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + m); return toISODate(d) }
const num = (s: string) => { const v = s.replace(/\s/g, ''); return v === '' ? null : Math.round(Number(v)) || null }

export function VisitForm({ carId, powertrain, visit, lastMileage, known }: {
    carId: number; powertrain: Powertrain; visit?: Visit; lastMileage?: number | null; known: { carParts: Part[]; allParts: Part[] }
}) {
    const router = useRouter()
    const today = toISODate(new Date())
    const [date, setDate] = useState(visit?.visit_date ? toISODate(new Date(visit.visit_date)) : today)
    const [mileage, setMileage] = useState(visit?.mileage?.toString() ?? '')
    const [works, setWorks] = useState(visit?.works ?? '')
    const [parts, setParts] = useState<Part[]>(visit?.parts.length ? visit.parts : [])
    const [labor, setLabor] = useState(visit?.labor_cost ? String(visit.labor_cost) : '')
    const [notes, setNotes] = useState(visit?.notes ?? '')
    const [recs, setRecs] = useState(visit?.recommendations ?? '')
    const [declined, setDeclined] = useState(visit?.declined ?? false)
    // следующее ТО подставляем сами (полгода / +10 000 км), пока мастер не поменял руками
    const [nextDate, setNextDate] = useState(visit?.next_date ? toISODate(new Date(visit.next_date)) : addMonths(today, DEFAULT_INTERVAL_MONTHS))
    const [nextKm, setNextKm] = useState(visit?.next_mileage?.toString() ?? '')
    const [nextTouched, setNextTouched] = useState(!!visit)
    const [photos, setPhotos] = useState<PendingPhoto[]>([])
    const [busy, setBusy] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const onDate = (v: string) => { setDate(v); if (!nextTouched && v) setNextDate(addMonths(v, DEFAULT_INTERVAL_MONTHS)) }
    const onMileage = (v: string) => { setMileage(v); const n = num(v); if (!nextTouched) setNextKm(n ? String(n + DEFAULT_INTERVAL_KM) : '') }
    const setPart = (i: number, patch: Partial<Part>) => setParts(parts.map((p, j) => (j === i ? { ...p, ...patch } : p)))
    const total = partsTotal(parts) + (num(labor) ?? 0)
    // Типовые работы: нажал — строка добавилась в «Что сделали», нажал ещё раз — убралась.
    const presets = workPresets(powertrain)
    const lines = works.split('\n').map((l) => l.trim()).filter(Boolean)
    const has = (w: string) => lines.includes(w)
    const toggleWork = (w: string) => setWorks((prev) => {
        const ls = prev.split('\n').map((l) => l.trim()).filter(Boolean)
        return (ls.includes(w) ? ls.filter((l) => l !== w) : [...ls, w]).join('\n')
    })
    // При добавлении работы — подставить деталь, которую ставили раньше (сначала этой машине, потом любой)
    const addKnownPart = (p: WorkPreset) => {
        if (!p.part || has(p.text)) return
        const found = known.carParts.find((x) => p.part!.test(x.name)) ?? known.allParts.find((x) => p.part!.test(x.name))
        if (found) setParts((prev) => (prev.some((x) => x.name.toLowerCase() === found.name.toLowerCase()) ? prev : [...prev.filter((x) => x.name.trim()), { ...found }]))
    }
    // Ввод названия детали: если такую уже ставили — подтянуть артикул и цену
    const onPartName = (i: number, name: string) => {
        const k = known.allParts.find((x) => x.name.toLowerCase() === name.trim().toLowerCase())
        setParts((prev) => prev.map((p, j) => (j !== i ? p : k ? { name, article: p.article || k.article, price: p.price || k.price } : { ...p, name })))
    }
    const Chip = ({ p }: { p: WorkPreset }) => (
        <button type="button" onClick={() => { addKnownPart(p); toggleWork(p.text) }} title={p.text}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${has(p.text) ? 'border-olive bg-olive/20 text-olive' : 'border-line text-white/85'}`}>
            {has(p.text) ? '✓ ' : '+ '}{p.label}
        </button>
    )

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        try {
            setBusy('Сохраняем визит…')
            const id = await saveVisit({
                id: visit?.id, car_id: carId, visit_date: date, mileage: num(mileage), works, parts, labor_cost: num(labor) ?? 0,
                notes, recommendations: recs, declined, next_date: nextDate || null, next_mileage: num(nextKm),
            })
            for (let i = 0; i < photos.length; i++) {
                setBusy(`Загружаем фото ${i + 1} из ${photos.length}…`)
                await uploadPhoto(id, await compressPhoto(photos[i].file), photos[i].kind)
            }
            router.push(`/visits/${id}`)
            router.refresh()
        } catch {
            setError('Не получилось сохранить. Проверьте интернет и попробуйте ещё раз.')
            setBusy(null)
        }
    }

    // Голосовой ввод: добавляем к уже введённому, ничего не затираем
    const applyVoice = (v: VoiceParsed | null, text: string) => {
        if (!v) { setWorks((prev) => [prev.trim(), text].filter(Boolean).join('\n')); return }
        setWorks((prev) => {
            const ls = prev.split('\n').map((l) => l.trim()).filter(Boolean)
            return [...ls, ...v.works.filter((w) => !ls.includes(w))].join('\n')
        })
        if (v.parts.length) setParts((prev) => [...prev.filter((p) => p.name.trim()), ...v.parts])
        if (v.labor_cost != null && !num(labor)) setLabor(String(v.labor_cost))
        if (v.mileage != null && !num(mileage)) onMileage(String(v.mileage))
        if (v.notes) setNotes((prev) => [prev.trim(), v.notes].filter(Boolean).join('\n'))
        if (v.recommendations) setRecs((prev) => [prev.trim(), v.recommendations].filter(Boolean).join('\n'))
    }

    // Быстрые кнопки «План на будущее»: срок от даты визита и пробег от текущего
    const setNextIn = (months: number) => { setNextTouched(true); setNextDate(addMonths(date, months)) }
    const setNextPlus = (k: number) => { const m = num(mileage); if (m) { setNextTouched(true); setNextKm(String(m + k)) } }
    const quick = 'rounded-full border border-gold/40 px-3 py-1.5 text-sm font-semibold text-gold active:bg-gold/20'

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <Section icon={<CalendarDays size={18} />} title="Сегодня" color="#53ADEF">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="label">Дата</label>
                        <input type="date" value={date} onChange={(e) => onDate(e.target.value)} className="input" required />
                    </div>
                    <div>
                        <label className="label">Пробег, км</label>
                        <input inputMode="numeric" value={mileage} onChange={(e) => onMileage(e.target.value)} className="input" placeholder={lastMileage ? `было ${lastMileage}` : '125 000'} />
                    </div>
                </div>
            </Section>

            <Section icon={<Wrench size={18} />} title="Работы и детали" color="#E5533D">
                <VoiceInput carId={carId} onResult={applyVoice} />
                <div className="flex flex-wrap gap-1.5">{presets.own.map((p) => <Chip key={p.text} p={p} />)}</div>
                <div className="text-xs font-semibold text-muted">Колёса и тормоза</div>
                <div className="flex flex-wrap gap-1.5">{presets.common.map((p) => <Chip key={p.text} p={p} />)}</div>
                <textarea value={works} onChange={(e) => setWorks(e.target.value)} rows={3} className="input" placeholder="Что сделали — кнопками выше или своими словами" />

                <div className="mt-1 flex items-center justify-between border-t border-line pt-3">
                    <span className="text-sm font-bold">Детали</span>
                    <button type="button" className="text-sm font-bold text-gold" onClick={() => setParts([...parts, { name: '', article: '', price: 0 }])}>
                        <span className="flex items-center gap-1"><Plus size={16} />Добавить деталь</span>
                    </button>
                </div>
                {parts.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-bg p-2">
                        <input value={p.name} onChange={(e) => onPartName(i, e.target.value)} list="known-parts" className="input" placeholder="Масло Shell 5W-30, 4 л" />
                        <button type="button" aria-label="Удалить деталь" onClick={() => setParts(parts.filter((_, j) => j !== i))} className="px-2 text-muted"><Trash2 size={18} /></button>
                        <input value={p.article ?? ''} onChange={(e) => setPart(i, { article: e.target.value })} className="input" placeholder="Артикул / производитель" />
                        <input inputMode="numeric" value={p.price ? String(p.price) : ''} onChange={(e) => setPart(i, { price: num(e.target.value) ?? 0 })} className="input w-28" placeholder="₽" />
                    </div>
                ))}
                <datalist id="known-parts">{known.allParts.map((p) => <option key={p.name} value={p.name} />)}</datalist>
                <div className="grid grid-cols-2 items-end gap-3">
                    <div>
                        <label className="label">Работа, ₽</label>
                        <input inputMode="numeric" value={labor} onChange={(e) => setLabor(e.target.value)} className="input" placeholder="0" />
                    </div>
                    <div className="rounded-xl bg-olive/15 px-3 py-3 text-right">
                        <div className="text-xs font-semibold text-olive/80">Итого</div>
                        <div className="text-lg font-black text-olive">{rub(total)}</div>
                    </div>
                </div>
            </Section>

            <Section icon={<Camera size={18} />} title="Фото" color="#8DB255">
                <PhotoPicker photos={photos} onChange={setPhotos} />
            </Section>

            <Section icon={<MessageSquare size={18} />} title="Заметки и рекомендации" color="#9AA7B0">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input" placeholder="Заметки: нюансы, что заметили" />
                <textarea value={recs} onChange={(e) => setRecs(e.target.value)} rows={2} className="input" placeholder="Рекомендации клиенту: скоро менять колодки…" />
                <label className="flex items-center gap-3 rounded-xl bg-bg p-3">
                    <input type="checkbox" checked={declined} onChange={(e) => setDeclined(e.target.checked)} className="h-6 w-6 accent-tomato" />
                    <span className="text-sm">Клиент <b>отказался</b> от рекомендаций (сохранится с датой — на случай спора)</span>
                </label>
            </Section>

            {/* План на будущее — отдельный «жёлтый» блок: это не про сегодняшний визит, а про следующий */}
            <section className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-gold/50 bg-gold/[0.07] p-4">
                <div className="flex items-center gap-2 text-gold">
                    <CalendarClock size={20} />
                    <div>
                        <div className="font-black">План: следующее ТО</div>
                        <div className="text-xs font-semibold text-gold/70">что наступит раньше — машина появится в «Пора на ТО»</div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                        <label className="label mb-0">Дата</label>
                        <input type="date" value={nextDate} onChange={(e) => { setNextTouched(true); setNextDate(e.target.value) }} className="input" />
                        <div className="flex flex-wrap gap-1.5">
                            {[3, 6, 12].map((m) => <button key={m} type="button" className={quick} onClick={() => setNextIn(m)}>{m} мес</button>)}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="label mb-0">Пробег, км</label>
                        <input inputMode="numeric" value={nextKm} onChange={(e) => { setNextTouched(true); setNextKm(e.target.value) }} className="input" placeholder="+10 000" />
                        <div className="flex flex-wrap gap-1.5">
                            {[5000, 10000, 15000].map((k) => <button key={k} type="button" className={quick} disabled={!num(mileage)} onClick={() => setNextPlus(k)}>+{k / 1000} т</button>)}
                        </div>
                    </div>
                </div>
            </section>

            {error && <p className="font-semibold text-tomato">{error}</p>}
            <button className="btn-primary sticky bottom-24 z-10 w-full" disabled={!!busy}>{busy ?? 'Сохранить визит'}</button>
        </form>
    )
}

// Блок формы: цветная полоска слева + иконка и заголовок — сразу видно, где какая часть визита.
function Section({ icon, title, color, children }: { icon: React.ReactNode; title: string; color: string; children: React.ReactNode }) {
    return (
        <section className="card flex flex-col gap-3 overflow-hidden p-4" style={{ boxShadow: `inset 4px 0 0 ${color}` }}>
            <div className="flex items-center gap-2 font-black" style={{ color }}>{icon}<span>{title}</span></div>
            {children}
        </section>
    )
}
