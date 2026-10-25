import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { LiveSearch } from '@/components/live-search'
import { searchCars, getDue } from '@/lib/data'
import { getDay, todayMsk, apptCar, apptWho, pendingAppts, ordersToDo, nextApptByCar } from '@/lib/appts'
import { dateRu } from '@/lib/format'
import { PlateBadge } from '@/components/plate'

// Главная: поиск по номеру / имени / телефону / марке и список машин.
// Машины с записью — сверху, от ближайшей записи к дальней, с зелёной пометкой «📅 Завтра в 10:00»; дальше — свежие визиты.
export default async function Home({ searchParams }: { searchParams: { q?: string } }) {
    const q = searchParams.q ?? ''
    const [found, due, today, pending, toOrder, nextAppt] = await Promise.all([searchCars(q), q ? Promise.resolve([]) : getDue(), q ? Promise.resolve([]) : getDay(todayMsk()), q ? Promise.resolve([]) : pendingAppts(), q ? Promise.resolve(0) : ordersToDo(), nextApptByCar()])
    const key = (id: number) => { const a = nextAppt.get(id); return a ? `${a.day} ${a.start_time}` : '' }
    const cars = q ? found : [...found.filter((c) => nextAppt.has(c.id)).sort((a, b) => key(a.id).localeCompare(key(b.id))), ...found.filter((c) => !nextAppt.has(c.id))]
    const tomorrow = (() => { const d = new Date(todayMsk() + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10) })()
    const whenText = (day: string) => day === todayMsk() ? 'Сегодня' : day === tomorrow ? 'Завтра' : new Date(day + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
    const waiting = today.filter((a) => a.status === 'planned')
    const byPhone = q.replace(/\D/g, '').length >= 3 // ищут по цифрам — показываем телефон в строке
    return (
        <>
            <LiveSearch initial={q} />
            {!q && toOrder > 0 && (
                <Link href="/order?days=3" className="card flex items-center justify-between gap-2 p-4">
                    <span><b>🛒 Что заказать к ТО</b><span className="block text-sm text-muted">Записей на 3 дня без заказанных деталей: {toOrder}</span></span>
                    <ChevronRight size={20} className="text-muted" />
                </Link>
            )}
            {!q && pending.length > 0 && (
                <Link href={`/calendar?d=${pending[0].day}`} className="card flex items-center justify-between gap-2 border-gold/60 bg-gold/10 p-4">
                    <span className="min-w-0">
                        <span className="font-bold text-gold">🆕 Новые заявки на запись: {pending.length}</span>
                        <span className="block truncate text-sm text-muted">{pending.slice(0, 2).map((a) => `${a.client_name || apptWho(a)} — ${new Date(a.day + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} ${a.start_time}`).join(' · ')}</span>
                    </span>
                    <ChevronRight className="shrink-0 text-gold" />
                </Link>
            )}
            {!q && waiting.length > 0 && (
                <Link href="/calendar" className="card flex items-center justify-between gap-2 border-basil/50 bg-basil/10 p-4">
                    <span className="min-w-0">
                        <span className="font-bold text-olive">📅 Сегодня записано: {waiting.length}</span>
                        <span className="block truncate text-sm text-muted">{waiting.slice(0, 3).map((a) => `${a.start_time} ${apptCar(a) || apptWho(a)}`).join(' · ')}</span>
                    </span>
                    <ChevronRight className="shrink-0 text-olive" />
                </Link>
            )}
            {!q && due.length > 0 && (
                <Link href="/due" className="card flex items-center justify-between border-gold/40 bg-gold/10 p-4">
                    <span className="font-bold text-gold">🔔 Пора на ТО: {due.length}</span>
                    <ChevronRight className="text-gold" />
                </Link>
            )}
            {cars.length === 0 ? (
                <div className="card p-6 text-center text-muted">
                    {q ? 'Ничего не нашлось.' : 'Пока ни одной машины.'}
                    <div className="mt-4"><Link href={q ? `/cars/new?plate=${encodeURIComponent(q)}` : '/cars/new'} className="btn-primary">Добавить машину</Link></div>
                </div>
            ) : (
                <ul className="flex flex-col gap-2">
                    {cars.map((c) => {
                        const a = nextAppt.get(c.id)
                        return (
                        <li key={c.id}>
                            <Link href={`/cars/${c.id}`} className={`card flex items-center gap-3 p-3 ${a ? 'border-basil/60 bg-basil/10' : ''}`}>
                                <PlateBadge plate={c.plate} />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-bold">{[c.brand, c.model].filter(Boolean).join(' ') || 'Без марки'}</div>
                                    <div className="truncate text-sm text-muted">{c.owner_name || 'Владелец не указан'}{byPhone && c.owner_phone ? ` · ${c.owner_phone}` : !a && c.last_visit ? ` · был ${dateRu(c.last_visit)}` : ''}</div>
                                    {a && (
                                        <div className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-semibold text-olive">
                                            <span className={`h-2 w-2 shrink-0 rounded-full ${a.status === 'pending' ? 'bg-gold' : 'bg-olive'}`} />
                                            {whenText(a.day)} в {a.start_time}{a.status === 'pending' ? ' · заявка' : ''}{a.work ? ` · ${a.work.split('\n')[0]}` : ''}
                                        </div>
                                    )}
                                </div>
                                <ChevronRight className="shrink-0 text-muted" />
                            </Link>
                        </li>
                        )
                    })}
                </ul>
            )}
        </>
    )
}
