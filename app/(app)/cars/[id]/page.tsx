import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Phone, Pencil, Plus, Camera, AlertTriangle } from 'lucide-react'
import { getCar, getVisits } from '@/lib/data'
import { dateRu, km, rub, partsTotal, telHref, POWERTRAIN_LABEL } from '@/lib/format'
import { PlateBadge } from '@/components/plate'
import { MessageButtons } from '@/components/message-buttons'
import { templatesFor } from '@/lib/messages'

// Карточка машины: данные + вся история визитов лентой (свежие сверху).
export default async function CarPage({ params }: { params: { id: string } }) {
    const car = await getCar(Number(params.id))
    if (!car) notFound()
    const visits = await getVisits(car.id)
    const next = visits[0]
    return (
        <>
            <section className="card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <PlateBadge plate={car.plate} big />
                        <h1 className="mt-2 text-2xl font-black">{[car.brand, car.model].filter(Boolean).join(' ') || 'Без марки'}</h1>
                        <p className="text-muted">{[POWERTRAIN_LABEL[car.powertrain], car.year, car.color].filter(Boolean).join(' · ')}{car.vin ? ` · VIN ${car.vin}` : ''}</p>
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
                {car.owner_phone && (
                    <details className="rounded-xl bg-bg p-3">
                        <summary className="cursor-pointer list-none font-bold">✉️ Написать клиенту</summary>
                        <div className="mt-3"><MessageButtons phone={car.owner_phone} templates={templatesFor(car, next?.next_date)} /></div>
                    </details>
                )}
                {car.notes && <p className="whitespace-pre-wrap rounded-xl bg-bg p-3 text-sm">📝 {car.notes}</p>}
                {next && (next.next_date || next.next_mileage) && (
                    <p className="rounded-xl bg-gold/10 p-3 text-sm font-semibold text-gold">
                        Следующее ТО: {[next.next_date && dateRu(next.next_date), next.next_mileage && `или на ${km(next.next_mileage)}`].filter(Boolean).join(' ')}
                    </p>
                )}
            </section>

            <Link href={`/cars/${car.id}/visits/new`} className="btn-primary w-full"><Plus size={20} />Новый визит</Link>

            <h2 className="mt-2 text-lg font-black">История · {visits.length}</h2>
            {visits.length === 0 && <p className="card p-4 text-center text-muted">Визитов пока не было.</p>}
            <ol className="relative flex flex-col gap-3 border-l-2 border-line pl-4">
                {visits.map((v) => {
                    const total = partsTotal(v.parts) + v.labor_cost
                    return (
                        <li key={v.id} className="relative">
                            <span className="absolute -left-[23px] top-4 h-3 w-3 rounded-full border-2 border-bg bg-tomato" />
                            <Link href={`/visits/${v.id}`} className="card block p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold">{dateRu(v.visit_date)}</span>
                                    <span className="text-sm text-muted">{km(v.mileage)}</span>
                                </div>
                                {v.works && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">{v.works}</p>}
                                {v.parts.length > 0 && <p className="mt-1 truncate text-sm text-muted">🔩 {v.parts.map((p) => p.name).join(', ')}</p>}
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                                    {total > 0 && <span className="font-semibold text-olive">{rub(total)}</span>}
                                    {v.photo_count > 0 && <span className="flex items-center gap-1 text-muted"><Camera size={14} />{v.photo_count}</span>}
                                    {!v.paid && <span className="rounded-md bg-tomato/15 px-2 py-0.5 font-bold text-tomato">не оплачено</span>}
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
