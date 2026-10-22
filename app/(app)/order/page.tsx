import Link from 'next/link'
import { buildOrders } from '@/lib/order'
import { OrderList } from '@/components/order-list'

export const dynamic = 'force-dynamic'

const PERIODS = [3, 7, 14]

// «Что заказать к ТО»: по записям в календаре — какие детали и масло купить заранее.
export default async function OrderPage({ searchParams }: { searchParams: { days?: string } }) {
    const days = PERIODS.includes(Number(searchParams.days)) ? Number(searchParams.days) : 7
    const cards = await buildOrders(days)
    return (
        <>
            <h1 className="text-2xl font-black">🛒 Что заказать к ТО</h1>
            <p className="text-sm text-muted">По записям в календаре. Детали — те, что ставили этой машине раньше; масло — из блока «Масло двигателя» в карточке.</p>
            <div className="flex gap-1.5">
                {PERIODS.map((d) => (
                    <Link key={d} href={`/order?days=${d}`} replace
                        className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${d === days ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'}`}>
                        {d === 3 ? '3 дня' : d === 7 ? 'Неделя' : '2 недели'}
                    </Link>
                ))}
            </div>
            {cards.length === 0
                ? <p className="card p-6 text-center text-muted">На эти дни нет записей с машинами из базы. Записи без машины (только имя и телефон) сюда не попадают — заведите машину из записи.</p>
                : <OrderList cards={cards} />}
        </>
    )
}
