'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { saveVisit } from '@/app/actions'
import type { Visit } from '@/lib/data'
import { DEFAULT_INTERVAL_KM, DEFAULT_INTERVAL_MONTHS, partsTotal, rub, toISODate, type Part } from '@/lib/format'
import { compressPhoto, uploadPhoto } from '@/lib/photo-client'
import { PhotoPicker, type PendingPhoto } from './photo-picker'

const addMonths = (iso: string, m: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + m); return toISODate(d) }
const num = (s: string) => { const v = s.replace(/\s/g, ''); return v === '' ? null : Math.round(Number(v)) || null }

export function VisitForm({ carId, visit, lastMileage }: { carId: number; visit?: Visit; lastMileage?: number | null }) {
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

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            <section className="card grid grid-cols-2 gap-3 p-4">
                <div>
                    <label className="label">Дата</label>
                    <input type="date" value={date} onChange={(e) => onDate(e.target.value)} className="input" required />
                </div>
                <div>
                    <label className="label">Пробег, км</label>
                    <input inputMode="numeric" value={mileage} onChange={(e) => onMileage(e.target.value)} className="input" placeholder={lastMileage ? `было ${lastMileage}` : '125 000'} />
                </div>
            </section>

            <section className="card flex flex-col gap-2 p-4">
                <label className="label">Что сделали</label>
                <textarea value={works} onChange={(e) => setWorks(e.target.value)} rows={4} className="input" placeholder="Замена масла и фильтров, проверка тормозов…" />
            </section>

            <section className="card flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                    <span className="label mb-0">Детали</span>
                    <button type="button" className="text-sm font-bold text-gold" onClick={() => setParts([...parts, { name: '', article: '', price: 0 }])}>
                        <span className="flex items-center gap-1"><Plus size={16} />Добавить</span>
                    </button>
                </div>
                {parts.length === 0 && <p className="text-sm text-muted">Деталей не было — или нажмите «Добавить».</p>}
                {parts.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-bg p-2">
                        <input value={p.name} onChange={(e) => setPart(i, { name: e.target.value })} className="input" placeholder="Масло Shell 5W-30, 4 л" />
                        <button type="button" aria-label="Удалить деталь" onClick={() => setParts(parts.filter((_, j) => j !== i))} className="px-2 text-muted"><Trash2 size={18} /></button>
                        <input value={p.article ?? ''} onChange={(e) => setPart(i, { article: e.target.value })} className="input" placeholder="Артикул / производитель" />
                        <input inputMode="numeric" value={p.price ? String(p.price) : ''} onChange={(e) => setPart(i, { price: num(e.target.value) ?? 0 })} className="input w-28" placeholder="₽" />
                    </div>
                ))}
                <div className="grid grid-cols-2 items-end gap-3">
                    <div>
                        <label className="label">Работа, ₽</label>
                        <input inputMode="numeric" value={labor} onChange={(e) => setLabor(e.target.value)} className="input" placeholder="0" />
                    </div>
                    <div className="pb-3 text-right text-lg font-black text-olive">Итого {rub(total)}</div>
                </div>
            </section>

            <section className="card flex flex-col gap-3 p-4">
                <label className="label mb-0">Фото</label>
                <PhotoPicker photos={photos} onChange={setPhotos} />
            </section>

            <section className="card flex flex-col gap-3 p-4">
                <div>
                    <label className="label">Заметки</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input" placeholder="Нюансы, что заметили" />
                </div>
                <div>
                    <label className="label">Рекомендации клиенту</label>
                    <textarea value={recs} onChange={(e) => setRecs(e.target.value)} rows={2} className="input" placeholder="Скоро менять колодки…" />
                </div>
                <label className="flex items-center gap-3 rounded-xl bg-bg p-3">
                    <input type="checkbox" checked={declined} onChange={(e) => setDeclined(e.target.checked)} className="h-6 w-6 accent-tomato" />
                    <span className="text-sm">Клиент <b>отказался</b> от рекомендаций (сохранится с датой — на случай спора)</span>
                </label>
            </section>

            <section className="card grid grid-cols-2 gap-3 p-4">
                <div className="col-span-2 label mb-0">Следующее ТО — что наступит раньше</div>
                <div>
                    <label className="label">Дата</label>
                    <input type="date" value={nextDate} onChange={(e) => { setNextTouched(true); setNextDate(e.target.value) }} className="input" />
                </div>
                <div>
                    <label className="label">Пробег, км</label>
                    <input inputMode="numeric" value={nextKm} onChange={(e) => { setNextTouched(true); setNextKm(e.target.value) }} className="input" placeholder="+10 000" />
                </div>
            </section>

            {error && <p className="font-semibold text-tomato">{error}</p>}
            <button className="btn-primary sticky bottom-24 z-10 w-full" disabled={!!busy}>{busy ?? (visit ? 'Сохранить визит' : 'Сохранить визит')}</button>
        </form>
    )
}
