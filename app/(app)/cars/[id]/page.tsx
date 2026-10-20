import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Phone, Pencil, Plus, Camera, AlertTriangle, CalendarPlus } from 'lucide-react'
import { todayMsk, upcomingForCar } from '@/lib/appts'
import { getCar, getVisits } from '@/lib/data'
import { colorHex } from '@/lib/car-dicts'
import { dateRu, km, rub, partsTotal, telHref, POWERTRAIN_LABEL } from '@/lib/format'
import { PlateBadge } from '@/components/plate'
import { MessageButtons } from '@/components/message-buttons'
import { templatesFor } from '@/lib/messages'
import { TgInvite } from '@/components/tg-invite'
import { MONEY } from '@/lib/features'
import { ttsEnabled } from '@/lib/tts'

// Карточка машины: данные + вся история визитов лентой (свежие сверху).
export default async function CarPage({ params }: { params: { id: string } }) {
    const car = await getCar(Number(params.id))
    if (!car) notFound()
    const [visits, appts] = await Promise.all([getVisits(car.id), upcomingForCar(car.id)])
    const next = visits[0]
    return (
        <>
            <section className="card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <PlateBadge plate={car.plate} big />
                        <h1 className="mt-2 text-2xl font-black">{[car.brand, car.model].filter(Boolean).join(' ') || 'Без марки'}</h1>
                        <p className="text-muted">{colorHex(car.color) && <span className="mr-1.5 inline-block h-3 w-3 rounded-full border border-line align-middle" style={{ background: colorHex(car.color) }} />}{[POWERTRAIN_LABEL[car.powertrain], car.year, car.color].filter(Boolean).join(' · ')}{car.vin ? ` · VIN ${car.vin}` : ''}</p>
                    </div>
                    <Link href={`/cars/${car.id}/edit`} className="btn-ghost min-h-[44px] px-3" aria-label="Редактировать"><Pencil size={18} /></Link>
                </div>
                {(car.owner_name || car.owner_phone) && (
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-bg p-3">
                        <div>
                            <div className="font-bold">{car.owner_name || 'Владелец'}</div>
                            <div className="text-sm text-muted">{car.owner_phone}</div>
                        </div>
                        {car.owner_phone && <a href={telHref(car.owner_phone)} className="btn-ghost min-h-[44px] px-4"><Phone size={18} />Позвонить</a>}
                    </div>
                )}
                {(car.owner_phone || car.tg_chat_id) && (
                    <details className="fold">
                        <summary className="fold-summary">💬 Связаться с клиентом</summary>
                        <div className="fold-body"><MessageButtons phone={car.owner_phone} templates={templatesFor(car, next?.next_date)} tgCarId={car.tg_chat_id ? car.id : null} voice={ttsEnabled()} /></div>
                    </details>
                )}
                <TgInvite car={car} />
                {car.notes && <p className="whitespace-pre-wrap rounded-xl bg-bg p-3 text-sm">📝 {car.notes}</p>}
                {next && (next.next_date || next.next_mileage) && (
                    <p className="rounded-xl bg-gold/10 p-3 text-sm font-semibold text-gold">
                        Следующее ТО: {[next.next_date && dateRu(next.next_date), next.next_mileage && `или на ${km(next.next_mileage)}`].filter(Boolean).join(' ')}
                    </p>
                )}
            </section>

            {appts.map((a) => (
                <Link key={a.id} href={`/calendar?d=${a.day}`} className="card flex items-center justify-between gap-2 border-basil/50 p-3 text-sm">
                    <span><b className="text-olive">📅 Записан:</b> {new Date(a.day + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}, {a.start_time}{a.work && ` — ${a.work.split('\n').filter(Boolean).join(', ')}`}</span>
                </Link>
            ))}
            <div className="grid grid-cols-[1fr_auto] gap-2">
                <Link href={`/cars/${car.id}/visits/new${appts[0] && appts[0].day <= todayMsk() ? `?appt=${appts[0].id}` : ''}`} className="btn-primary"><Plus size={20} />Новый визит</Link>
                <Link href={`/calendar/new?car=${car.id}`} className="btn-ghost px-4"><CalendarPlus size={20} />Записать</Link>
            </div>

            <h2 className="mt-2 text-lg font-black">История · {visits.length}</h2>
            {visits.length === 0 && <p className="card p-4 text-center text-muted">Визитов пока не было.</p>}
            <ol className="relative flex flex-col gap-3 border-l-2 border-line pl-4">
                {visits.map((v) => {
                    const total = partsTotal(v.parts) + v.labor_cost
                    return (
                        <li key={v.id} className="relative">
                            <span className="absolute -left-[23px] top-4 h-3 w-3 rounded-full border-2 border-bg bg-olive" />
                            <Link href={`/visits/${v.id}`} className="card block p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold">{dateRu(v.visit_date)}</span>
                                    <span className="text-sm text-muted">{km(v.mileage)}</span>
                                </div>
                                {v.works && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">{v.works}</p>}
                                {v.parts.length > 0 && <p className="mt-1 truncate text-sm text-muted">🔩 {v.parts.map((p) => p.name).join(', ')}</p>}
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                                    {MONEY && total > 0 && <span className="font-semibold text-olive">{rub(total)}</span>}
                                    {v.photo_count > 0 && <span className="flex items-center gap-1 text-muted"><Camera size={14} />{v.photo_count}</span>}
                                    {MONEY && !v.paid && <span className="rounded-md bg-tomato/15 px-2 py-0.5 font-bold text-tomato">не оплачено</span>}
                                    {v.declined && <span className="flex items-center gap-1 text-gold"><AlertTriangle size={14} />отказ от рекомендации</span>}
                                </div>
                            </Link>
                        </li>
                    )
                })}
            </ol>
        </>
    )
}
