import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCar, getPhotos, getVisitByToken } from '@/lib/data'
import { dateRu, km, rub, partsTotal } from '@/lib/format'
import { kindLabel } from '@/lib/photo-client'

export const metadata: Metadata = { title: 'Отчёт о визите — Garaggio', robots: { index: false, follow: false } }

// Отчёт клиенту по секретной ссылке: без входа, только этот визит.
export default async function Report({ params }: { params: { token: string } }) {
    const visit = await getVisitByToken(params.token)
    if (!visit) notFound()
    const [car, photos] = await Promise.all([getCar(visit.car_id), getPhotos(visit.id)])
    const partsSum = partsTotal(visit.parts)
    const works = visit.works.split('\n').map((l) => l.trim()).filter(Boolean)
    return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-4 pb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="Garaggio" className="mx-auto w-48 rounded-2xl" />
            <section className="card p-4 text-center">
                <p className="text-gold">Грацие, что заехали! 🤌</p>
                <h1 className="mt-1 text-2xl font-black">{[car?.brand, car?.model].filter(Boolean).join(' ')}</h1>
                <p className="text-muted">{dateRu(visit.visit_date)} · пробег {km(visit.mileage)}</p>
            </section>
            {works.length > 0 && (
                <section className="card p-4">
                    <h2 className="mb-2 font-black">Что сделали</h2>
                    <ul className="flex flex-col gap-1.5">{works.map((w, i) => <li key={i} className="flex gap-2"><span className="text-olive">✓</span>{w}</li>)}</ul>
                </section>
            )}
            {(visit.parts.length > 0 || visit.labor_cost > 0) && (
                <section className="card p-4">
                    <h2 className="mb-2 font-black">Детали и работа</h2>
                    <table className="w-full text-sm">
                        <tbody>
                            {visit.parts.map((p, i) => (
                                <tr key={i} className="border-t border-line">
                                    <td className="py-2 pr-2">{p.name}{p.article && <div className="text-xs text-muted">{p.article}</div>}</td>
                                    <td className="py-2 text-right whitespace-nowrap">{p.price ? rub(p.price) : ''}</td>
                                </tr>
                            ))}
                            {visit.labor_cost > 0 && <tr className="border-t border-line"><td className="py-2">Работа</td><td className="py-2 text-right">{rub(visit.labor_cost)}</td></tr>}
                        </tbody>
                    </table>
                    <div className="mt-2 flex justify-between rounded-xl bg-olive/15 p-3 font-black text-olive"><span>Итого</span><span>{rub(partsSum + visit.labor_cost)}</span></div>
                </section>
            )}
            {photos.length > 0 && (
                <section className="card p-4">
                    <h2 className="mb-2 font-black">Фото</h2>
                    <div className="grid grid-cols-2 gap-2">
                        {photos.map((p) => (
                            <a key={p.id} href={`/r/${params.token}/photo/${p.id}`} target="_blank" rel="noreferrer" className="relative aspect-square overflow-hidden rounded-xl border border-line">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`/r/${params.token}/photo/${p.id}`} alt="" loading="lazy" className="h-full w-full object-cover" />
                                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 text-xs">{kindLabel(p.kind)}</span>
                            </a>
                        ))}
                    </div>
                </section>
            )}
            {visit.recommendations && (
                <section className="card border-gold/40 p-4">
                    <h2 className="mb-1 font-black text-gold">Рекомендации мастера</h2>
                    <p className="whitespace-pre-wrap">{visit.recommendations}</p>
                </section>
            )}
            {(visit.next_date || visit.next_mileage) && (
                <section className="rounded-2xl border-2 border-dashed border-gold/50 bg-gold/[0.07] p-4 text-center">
                    <div className="font-black text-gold">Следующее ТО</div>
                    <div>{[visit.next_date && dateRu(visit.next_date), visit.next_mileage && `или на ${km(visit.next_mileage)}`].filter(Boolean).join(' ')}</div>
                    <div className="mt-1 text-sm text-muted">Мы напомним 🤌</div>
                </section>
            )}
            <p className="text-center text-sm text-muted">Garaggio · гараж с характером</p>
        </main>
    )
}
