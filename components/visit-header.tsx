import Link from 'next/link'
import type { Car } from '@/lib/data'
import { POWERTRAIN_LABEL } from '@/lib/format'
import { PlateBadge } from './plate'
import { oilLine } from '@/lib/format'

// Шапка формы визита: номер + марка/модель (тап — карточка машины) и заголовок.
export function VisitHeader({ car, title, wishes = [] }: { car: Car; title: string; wishes?: { id: number; text: string }[] }) {
    return (
        <div className="flex flex-col gap-1">
            <Link href={`/cars/${car.id}`} className="flex items-center gap-3">
                <PlateBadge plate={car.plate} />
                <span className="truncate font-bold">{[car.brand, car.model].filter(Boolean).join(' ') || 'Без марки'}</span>
                <span className="shrink-0 text-sm text-muted">{POWERTRAIN_LABEL[car.powertrain]}</span>
            </Link>
            {oilLine(car) && <p className="text-sm"><b className="text-[#F09B38]">🛢 Масло:</b> <span className="text-muted">{oilLine(car)}</span></p>}
            {wishes.length > 0 && (
                <div className="rounded-xl border border-gold/40 bg-gold/[0.07] p-3 text-sm">
                    <b className="text-gold">📝 Клиент хочет:</b>
                    <ul className="mt-1 list-disc pl-5">{wishes.map((w) => <li key={w.id} className="whitespace-pre-wrap">{w.text}</li>)}</ul>
                </div>
            )}
            <h1 className="text-2xl font-black">{title}</h1>
        </div>
    )
}
