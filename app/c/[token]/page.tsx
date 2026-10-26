import crypto from 'node:crypto'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Camera, Check } from 'lucide-react'
import { sql } from '@/lib/db'
import { getCarByOwnerToken, getVisits, getWishes } from '@/lib/data'
import { dateRu, km, oilLine } from '@/lib/format'
import { PlateBadge } from '@/components/plate'
import { WishForm } from '../wish-form'
import { NumberedText } from '@/components/numbered-text'
import { splitItems } from '@/lib/items'

export const metadata: Metadata = { title: 'Моя машина — Garaggio', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// Страница владельца по секретной ссылке: вся история ТО (каждый визит — со ссылкой на отчёт с фото)
// и «что сделать на следующем ТО». Точное время приезда согласуем по телефону, поэтому записи на время тут нет.
export default async function OwnerPage({ params }: { params: { token: string } }) {
    const car = await getCarByOwnerToken(params.token)
    if (!car) notFound()
    // у визитов без ссылки на отчёт создаём её сейчас — владелец сможет открыть любой прошлый отчёт
    const missing = await sql<{ id: number }[]>`SELECT id FROM visits WHERE car_id = ${car.id} AND share_token IS NULL`
    for (const v of missing) await sql`UPDATE visits SET share_token = ${crypto.randomBytes(12).toString('base64url')} WHERE id = ${v.id} AND share_token IS NULL`
    const [visits, wishes] = await Promise.all([getVisits(car.id), getWishes(car.id)])
    const next = visits[0]
    const oil = oilLine(car)
    const name = car.owner_name.split(' ')[0]
    return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 p-4 pb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="Garaggio" className="mx-auto w-40 rounded-2xl" />
            <section className="card flex flex-col items-center gap-2 p-4 text-center">
                <p className="text-gold">{name ? `Чао, ${name}! 🤌` : 'Чао! 🤌'}</p>
                <h1 className="text-2xl font-black">{[car.brand, car.model].filter(Boolean).join(' ') || 'Ваша машина'}</h1>
                {car.plate && <PlateBadge plate={car.plate} />}
                {oil && <p className="text-sm text-muted">🛢 Масло: {oil}</p>}
            </section>

            {next && (next.next_date || next.next_mileage) && (
                <section className="rounded-2xl border-2 border-dashed border-gold/50 bg-gold/[0.07] p-4 text-center">
                    <div className="font-black text-gold">Следующее ТО</div>
                    <div>{[next.next_date && dateRu(next.next_date), next.next_mileage && `или на ${km(next.next_mileage)}`].filter(Boolean).join(' ')}</div>
                </section>
            )}

            <section className="card flex flex-col gap-3 p-4">
                <h2 className="font-black">Что сделать на следующем ТО?</h2>
                <WishForm token={params.token} />
                {wishes.length > 0 && (
                    <ul className="flex flex-col gap-2 border-t border-line pt-3">
                        {wishes.map((w) => (
                            <li key={w.id} className="rounded-xl bg-bg p-3 text-sm">
                                <div className="flex items-center justify-between gap-2 text-xs text-muted">
                                    <span>{new Date(w.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' })}</span>
                                    {w.done ? <span className="flex items-center gap-1 font-bold text-olive"><Check size={14} />Маэстро учёл</span> : <span>ждёт Маэстро</span>}
                                </div>
                                <NumberedText text={w.text} className="mt-1" />
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <h2 className="mt-2 text-lg font-black">История ТО · {visits.length}</h2>
            {visits.length === 0 && <p className="card p-4 text-center text-muted">Визитов пока не было.</p>}
            <ol className="relative flex flex-col gap-3 border-l-2 border-line pl-4">
                {visits.map((v) => {
                    const works = splitItems(v.works)
                    return (
                        <li key={v.id} className="relative">
                            <span className="absolute -left-[23px] top-4 h-3 w-3 rounded-full border-2 border-bg bg-olive" />
                            <a href={`/r/${v.share_token}`} className="card block p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold">{dateRu(v.visit_date)}</span>
                                    <span className="text-sm text-muted">{km(v.mileage)}</span>
                                </div>
                                {works.length > 0 && <ol className="mt-2 flex flex-col gap-1 text-sm">{works.map((w, i) => <li key={i} className="flex gap-2"><span className="shrink-0 font-bold tabular-nums text-olive">{i + 1}.</span>{w}</li>)}</ol>}
                                {v.recommendations && <div className="mt-2 rounded-xl bg-gold/10 p-2 text-sm text-gold"><b>Рекомендации</b><NumberedText text={v.recommendations} className="mt-1" /></div>}
                                <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-gold">{v.photo_count > 0 && <Camera size={14} />}Отчёт{v.photo_count > 0 ? ' с фото' : ''} →</div>
                            </a>
                        </li>
                    )
                })}
            </ol>
            <p className="text-center text-sm text-muted">Garaggio · гараж с характером</p>
            <a href="/privacy" className="text-center text-xs text-muted underline">Политика обработки персональных данных</a>
        </main>
    )
}
