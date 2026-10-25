import type { Metadata } from 'next'
import { SELF_DAYS_AHEAD, SELF_WORKS, todayMsk, WORK_DAY } from '@/lib/appts'
import { BookingForm, type Me } from './booking-form'
import { chatFromBookingKey } from '@/lib/tg'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Запись в Garaggio', description: 'Выберите удобное время — Маэстро подтвердит запись.' }

// Самозапись: открывается без входа (ссылка/QR от мастера). Только свободное время, чужих записей не видно.
// По личной ссылке из бота (?k=…) знаем клиента: подставим имя, телефон и его машины (выбор из списка, если их несколько)
async function getMe(k?: string): Promise<Me | null> {
    const chat = chatFromBookingKey(k)
    if (!chat) return null
    const [ch] = await sql<{ name: string; phone: string }[]>`SELECT name, phone FROM tg_chats WHERE chat_id = ${chat}`
    const cars = await sql<{ id: number; brand: string; model: string; plate: string; owner_name: string; owner_phone: string }[]>`
        SELECT id, brand, model, plate, owner_name, owner_phone FROM cars WHERE tg_chat_id = ${chat} ORDER BY id`
    if (!ch && !cars.length) return null
    return {
        name: (cars[0]?.owner_name || ch?.name || '').split(' ')[0],
        phone: cars[0]?.owner_phone || ch?.phone || '',
        cars: cars.map(({ id, brand, model, plate }) => ({ id, brand, model, plate })),
    }
}

export default async function ZapisPage({ searchParams }: { searchParams: { k?: string } }) {
    const me = await getMe(searchParams.k)
    const today = todayMsk()
    const days = Array.from({ length: SELF_DAYS_AHEAD + 1 }, (_, i) => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10) })
    return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-3 p-4 pb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="Garaggio" className="mx-auto w-40 rounded-2xl" />
            <div className="text-center">
                <h1 className="text-2xl font-black">{me?.name ? `Чао, ${me.name}! 🤌` : 'Запись в Garaggio 🤌'}</h1>
                <p className="text-sm text-muted">Каждый день с {WORK_DAY.from} до {WORK_DAY.to}. Выберите удобное время — Маэстро подтвердит запись.</p>
            </div>
            <BookingForm me={me} days={days} works={SELF_WORKS.map((w) => ({ id: w.id, label: w.label, minutes: w.minutes }))} />
        </main>
    )
}
