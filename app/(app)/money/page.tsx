import Link from 'next/link'
import { getMoney } from '@/lib/data'
import { dateRu, partsTotal, rub } from '@/lib/format'
import { PlateBadge } from '@/components/plate'
import { PaidToggle } from '@/components/paid-toggle'

const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
const monthLabel = (m: string) => { const [y, mm] = m.split('-'); return `${MONTHS[Number(mm) - 1]} ${y}` }

// Деньги: кто должен (неоплаченные визиты) и выручка по месяцам — работа отдельно от деталей.
export default async function MoneyPage() {
    const { months, unpaid } = await getMoney()
    const debt = unpaid.reduce((s, v) => s + v.labor_cost + partsTotal(v.parts), 0)
    const now = new Date(), thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const cur = months.find((m) => m.month === thisMonth) ?? { month: thisMonth, visits: 0, labor: 0, parts: 0 }
    return (
        <>
            <h1 className="text-2xl font-black">Деньги</h1>

            <section className="card flex flex-col gap-3 p-4">
                <div className="text-sm text-muted">Этот месяц · {monthLabel(cur.month)}</div>
                <div className="text-3xl font-black text-olive">{rub(cur.labor + cur.parts)}</div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-xl bg-bg p-2"><div className="text-muted">Работа</div><b>{rub(cur.labor)}</b></div>
                    <div className="rounded-xl bg-bg p-2"><div className="text-muted">Детали</div><b>{rub(cur.parts)}</b></div>
                    <div className="rounded-xl bg-bg p-2"><div className="text-muted">Визитов</div><b>{cur.visits}</b></div>
                </div>
            </section>

            <h2 className="mt-2 text-lg font-black">Долги {unpaid.length > 0 && <span className="text-tomato">· {rub(debt)}</span>}</h2>
            {unpaid.length === 0 && <p className="card p-4 text-center text-muted">Все заплатили 🤌</p>}
            <ul className="flex flex-col gap-2">
                {unpaid.map((v) => (
                    <li key={v.id} className="card flex items-center gap-3 p-3">
                        <Link href={`/visits/${v.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                            <PlateBadge plate={v.plate} />
                            <div className="min-w-0">
                                <div className="truncate font-bold">{[v.brand, v.model].filter(Boolean).join(' ')}</div>
                                <div className="truncate text-sm text-muted">{v.owner_name} · {dateRu(v.visit_date)}</div>
                                <div className="text-sm font-black text-tomato">{rub(v.labor_cost + partsTotal(v.parts))}</div>
                            </div>
                        </Link>
                        <PaidToggle visitId={v.id} paid={false} compact />
                    </li>
                ))}
            </ul>

            <h2 className="mt-2 text-lg font-black">По месяцам</h2>
            {months.length === 0 && <p className="card p-4 text-center text-muted">Визитов пока нет.</p>}
            <ul className="card divide-y divide-line">
                {months.map((m) => {
                    const max = Math.max(...months.map((x) => x.labor + x.parts), 1)
                    return (
                        <li key={m.month} className="flex flex-col gap-1 p-3">
                            <div className="flex justify-between text-sm">
                                <span className="font-bold capitalize">{monthLabel(m.month)}</span>
                                <b className="text-olive">{rub(m.labor + m.parts)}</b>
                            </div>
                            <div className="flex h-2 overflow-hidden rounded-full bg-bg">
                                <div className="bg-olive" style={{ width: `${(m.labor / max) * 100}%` }} />
                                <div className="bg-gold" style={{ width: `${(m.parts / max) * 100}%` }} />
                            </div>
                            <div className="text-xs text-muted">работа {rub(m.labor)} · детали {rub(m.parts)} · визитов {m.visits}</div>
                        </li>
                    )
                })}
            </ul>
            {months.length > 0 && <p className="text-xs text-muted"><span className="text-olive">■</span> работа <span className="ml-2 text-gold">■</span> детали</p>}
        </>
    )
}
