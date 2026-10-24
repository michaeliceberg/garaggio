import Link from 'next/link'
import type { Car } from '@/lib/data'
import { POWERTRAIN_LABEL } from '@/lib/format'
import { PlateBadge } from './plate'
import { dateRu, oilLine } from '@/lib/format'
import { NumberedText } from './numbered-text'

type Prev = { date: string | Date; text: string; declined: boolean }

// Шапка формы визита: номер + марка/модель (тап — карточка машины), масло, заголовок и — у нового визита —
// блок «К этому ТО»: рекомендации прошлого визита и пожелания владельца с его страницы (чтобы не искать их по приложению).
export function VisitHeader({ car, title, wishes = [], prev }: { car: Car; title: string; wishes?: { id: number; text: string }[]; prev?: Prev | null }) {
    return (
        <div className="flex flex-col gap-1">
            <Link href={`/cars/${car.id}`} className="flex items-center gap-3">
                <PlateBadge plate={car.plate} />
                <span className="truncate font-bold">{[car.brand, car.model].filter(Boolean).join(' ') || 'Без марки'}</span>
                <span className="shrink-0 text-sm text-muted">{POWERTRAIN_LABEL[car.powertrain]}</span>
            </Link>
            {oilLine(car) && <p className="text-sm"><b className="text-[#F09B38]">🛢 Масло:</b> <span className="text-muted">{oilLine(car)}</span></p>}
            <h1 className="text-2xl font-black">{title}</h1>
            {(prev?.text || wishes.length > 0) && (
                <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-gold/40 bg-gold/[0.07] p-3 text-sm">
                    <b className="text-gold">📋 К этому ТО</b>
                    {prev?.text && (
                        <div>
                            <div className="text-xs font-bold text-muted">Рекомендации с прошлого визита ({dateRu(prev.date)}){prev.declined ? ' · клиент тогда отказался' : ''}</div>
                            <NumberedText text={prev.text} />
                        </div>
                    )}
                    {wishes.length > 0 && (
                        <div>
                            <div className="text-xs font-bold text-muted">📝 Клиент хочет (написал на своей странице)</div>
                            <ul className="list-disc pl-5">{wishes.map((w) => <li key={w.id}><NumberedText text={w.text} /></li>)}</ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
