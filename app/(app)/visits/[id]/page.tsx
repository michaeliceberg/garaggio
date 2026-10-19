import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, X, AlertTriangle } from 'lucide-react'
import { getCar, getPhotos, getVisit } from '@/lib/data'
import { dateRu, km, rub, partsTotal } from '@/lib/format'
import { PaidToggle } from '@/components/paid-toggle'
import { kindLabel } from '@/lib/photo-client'
import { PlateBadge } from '@/components/plate'
import { AddPhotos } from '@/components/add-photos'
import { ShareReport } from '@/components/share-report'
import { ConfirmButton } from '@/components/confirm-button'
import { deletePhoto, deleteVisit } from '@/app/actions'

export default async function VisitPage({ params }: { params: { id: string } }) {
    const visit = await getVisit(Number(params.id))
    if (!visit) notFound()
    const [car, photos] = await Promise.all([getCar(visit.car_id), getPhotos(visit.id)])
    const partsSum = partsTotal(visit.parts)
    return (
        <>
            <Link href={`/cars/${visit.car_id}`} className="flex items-center gap-3">
                <PlateBadge plate={car?.plate ?? ''} />
                <span className="text-muted">{[car?.brand, car?.model].filter(Boolean).join(' ')}</span>
            </Link>
            <section className="card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-black">{dateRu(visit.visit_date)}</h1>
                        <p className="text-muted">Пробег {km(visit.mileage)}</p>
                    </div>
                    <Link href={`/visits/${visit.id}/edit`} className="btn-ghost min-h-[44px] px-3" aria-label="Редактировать"><Pencil size={18} /></Link>
                </div>
                {visit.works && <p className="whitespace-pre-wrap">{visit.works}</p>}
                {visit.parts.length > 0 && (
                    <table className="w-full text-sm">
                        <tbody>
                            {visit.parts.map((p, i) => (
                                <tr key={i} className="border-t border-line">
                                    <td className="py-2 pr-2">{p.name}{p.article && <div className="text-xs text-muted">{p.article}</div>}</td>
                                    <td className="py-2 text-right whitespace-nowrap">{p.price ? rub(p.price) : ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div className="flex justify-between rounded-xl bg-bg p-3 text-sm">
                    <span className="text-muted">Детали {rub(partsSum)} · работа {rub(visit.labor_cost)}</span>
                    <b className="text-olive">{rub(partsSum + visit.labor_cost)}</b>
                </div>
                <PaidToggle visitId={visit.id} paid={visit.paid} />
                {visit.notes && <p className="whitespace-pre-wrap rounded-xl bg-bg p-3 text-sm">📝 {visit.notes}</p>}
                {visit.recommendations && (
                    <div className={`rounded-xl p-3 text-sm ${visit.declined ? 'bg-gold/10 text-gold' : 'bg-bg'}`}>
                        <b>Рекомендации:</b> {visit.recommendations}
                        {visit.declined && <div className="mt-1 flex items-center gap-1 font-bold"><AlertTriangle size={14} />Клиент отказался ({dateRu(visit.visit_date)})</div>}
                    </div>
                )}
                {(visit.next_date || visit.next_mileage) && (
                    <p className="text-sm text-muted">Следующее ТО: {[visit.next_date && dateRu(visit.next_date), visit.next_mileage && km(visit.next_mileage)].filter(Boolean).join(' или ')}</p>
                )}
            </section>

            <ShareReport visitId={visit.id} token={visit.share_token} phone={car?.owner_phone ?? ''}
                hello={car?.owner_name ? `Чао, ${car.owner_name.split(' ')[0]}!` : 'Чао!'} car={[car?.brand, car?.model].filter(Boolean).join(' ')} tgCarId={car?.tg_chat_id ? car.id : null} />

            <section className="card flex flex-col gap-3 p-4">
                <h2 className="font-black">Фото · {photos.length}</h2>
                {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        {photos.map((p) => (
                            <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                                <a href={`/api/photos/${p.id}`} target="_blank" rel="noreferrer">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`/api/photos/${p.id}`} alt="" loading="lazy" className="h-full w-full object-cover" />
                                </a>
                                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 text-xs">{kindLabel(p.kind)}</span>
                                <form action={deletePhoto} className="absolute right-1 top-1">
                                    <input type="hidden" name="id" value={p.id} />
                                    <input type="hidden" name="visit_id" value={visit.id} />
                                    <ConfirmButton message="Удалить это фото?" className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70"><X size={16} /></ConfirmButton>
                                </form>
                            </div>
                        ))}
                    </div>
                )}
                <AddPhotos visitId={visit.id} />
            </section>

            <form action={deleteVisit}>
                <input type="hidden" name="id" value={visit.id} />
                <input type="hidden" name="car_id" value={visit.car_id} />
                <ConfirmButton className="btn-danger w-full" message="Удалить визит вместе с фото? Это нельзя отменить.">Удалить визит</ConfirmButton>
            </form>
        </>
    )
}
