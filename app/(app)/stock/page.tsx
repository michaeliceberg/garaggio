import Link from 'next/link'
import { getRecentMoves, getStock } from '@/lib/stock'
import { buildOrders } from '@/lib/order'
import { itemLabel, isLow, qtyText, fmtQty, unitOf, type StockItem } from '@/lib/stock-match'
import { StockBoard } from '@/components/stock-board'

export const dynamic = 'force-dynamic'

// Склад масла и фильтров. Сверху — хватит ли на записи недели и что заканчивается, ниже — все позиции.
export default async function StockPage() {
    const [items, moves, orders] = await Promise.all([getStock(), getRecentMoves(), buildOrders(7)])

    // Потребность на неделю по записям: масло и фильтры
    const need = new Map<number, { item: StockItem; qty: number; cars: string[] }>()
    const missingOil = new Map<string, { qty: number; cars: string[] }>()
    const missing: { name: string; car: string }[] = []
    for (const c of orders) {
        const carName = `${c.car.plate}`
        for (const i of c.items) {
            if (!i.oil && !/фильтр/i.test(i.work)) continue
            if (i.stockId) {
                const it = items.find((x) => x.id === i.stockId)!
                const row = need.get(it.id) ?? { item: it, qty: 0, cars: [] }
                row.qty += i.need ?? (i.oil ? 0 : 1); row.cars.push(carName); need.set(it.id, row)
            } else if (i.oil && i.oilSpec) {
                const row = missingOil.get(i.oilSpec) ?? { qty: 0, cars: [] }
                row.qty += i.need ?? 0; row.cars.push(carName); missingOil.set(i.oilSpec, row)
            } else missing.push({ name: i.name, car: carName })
        }
    }
    const needRows = Array.from(need.values())
    const low = items.filter(isLow)
    const short = needRows.filter((r) => r.qty > r.item.qty)

    return (
        <>
            <div className="flex items-end justify-between gap-2">
                <h1 className="text-2xl font-black">📦 Склад</h1>
                <span className="text-sm text-muted">масло и фильтры</span>
            </div>

            {items.length === 0 && (
                <p className="card p-4 text-sm">Начните с того, что стоит на полке: нажмите <b>«🎤 Надиктовать остатки»</b> и скажите, например,
                    «Шелл пять-тридцать три канистры по четыре литра, фильтр Манн семьсот двенадцать дробь семьдесят пять — три штуки».
                    Дальше склад ведётся сам: деталь в визите списывается, «Пришло» — добавляет.</p>
            )}

            {(needRows.length > 0 || missingOil.size > 0 || missing.length > 0) && (
                <section className="card flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-black">🗓 На записи недели</h2>
                        <Link href="/order" className="text-sm font-bold text-gold">Что заказать →</Link>
                    </div>
                    {needRows.map((r) => {
                        const ok = r.item.qty >= r.qty
                        return (
                            <div key={r.item.id} className={`flex items-center justify-between gap-3 rounded-xl p-3 text-sm ${ok ? 'bg-bg' : 'bg-tomato/15'}`}>
                                <span className="min-w-0"><b>{itemLabel(r.item)}</b><span className="block text-xs text-muted">{r.cars.join(', ')}</span></span>
                                <span className={`shrink-0 text-right font-bold ${ok ? 'text-olive' : 'text-tomato'}`}>
                                    нужно {fmtQty(r.qty)} {unitOf(r.item.kind)}<span className="block text-xs font-semibold">{ok ? `есть ${qtyText(r.item)} ✓` : `есть ${qtyText(r.item)} · не хватает ${fmtQty(r.qty - r.item.qty)}`}</span>
                                </span>
                            </div>
                        )
                    })}
                    {Array.from(missingOil.entries()).map(([spec, r]) => (
                        <div key={spec} className="flex items-center justify-between gap-3 rounded-xl bg-tomato/15 p-3 text-sm">
                            <span className="min-w-0"><b>Масло {spec}</b><span className="block text-xs text-muted">{r.cars.join(', ')}</span></span>
                            <span className="shrink-0 text-right font-bold text-tomato">{r.qty ? `нужно ${fmtQty(r.qty)} л` : 'нужно'}<span className="block text-xs font-semibold">на складе нет</span></span>
                        </div>
                    ))}
                    {missing.length > 0 && (
                        <p className="rounded-xl bg-bg p-3 text-xs text-muted">Нет на складе: {missing.map((m) => `${m.name} (${m.car})`).join('; ')}</p>
                    )}
                    {short.length === 0 && missingOil.size === 0 && needRows.length > 0 && <p className="text-sm font-semibold text-olive">Всего хватает 👌</p>}
                </section>
            )}

            {low.length > 0 && (
                <p className="rounded-2xl border border-tomato/40 bg-tomato/10 p-3 text-sm">
                    <b className="text-tomato">Заканчивается:</b> {low.map((i) => `${itemLabel(i)} — ${qtyText(i)}`).join('; ')}
                </p>
            )}

            <StockBoard items={items} moves={moves.map((m) => ({ ...m, created_at: new Date(m.created_at).toISOString() }))} />
        </>
    )
}
