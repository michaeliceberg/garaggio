import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { LiveSearch } from '@/components/live-search'
import { searchCars, getDue } from '@/lib/data'
import { getDay, todayMsk, apptCar, apptWho, pendingAppts } from '@/lib/appts'
import { dateRu } from '@/lib/format'
import { PlateBadge } from '@/components/plate'

// Главная: поиск по номеру / имени / телефону / марке и список машин (свежие визиты — сверху).
export default async function Home({ searchParams }: { searchParams: { q?: string } }) {
    const q = searchParams.q ?? ''
    const [cars, due, today, pending] = await Promise.all([searchCars(q), q ? Promise.resolve([]) : getDue(), q ? Promise.resolve([]) : getDay(todayMsk()), q ? Promise.resolve([]) : pendingAppts()])
    const waiting = today.filter((a) => a.status === 'planned')
    const byPhone = q.replace(/\D/g, '').length >= 3 // ищут по цифрам — показываем телефон в строке
    return (
        <>
            <LiveSearch initial={q} />
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
                    {cars.map((c) => (
                        <li key={c.id}>
                            <Link href={`/cars/${c.id}`} className="card flex items-center gap-3 p-3">
                                <PlateBadge plate={c.plate} />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-bold">{[c.brand, c.model].filter(Boolean).join(' ') || 'Без марки'}</div>
                                    <div className="truncate text-sm text-muted">{c.owner_name || 'Владелец не указан'}{byPhone && c.owner_phone ? ` · ${c.owner_phone}` : c.last_visit ? ` · был ${dateRu(c.last_visit)}` : ''}</div>
                                </div>
                                <ChevronRight className="shrink-0 text-muted" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </>
    )
}
