import type { Metadata } from 'next'
import { SELF_DAYS_AHEAD, SELF_WORKS, todayMsk, WORK_DAY } from '@/lib/appts'
import { BookingForm } from './booking-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Запись в Garaggio', description: 'Выберите удобное время — мастер подтвердит запись.' }

// Самозапись: открывается без входа (ссылка/QR от мастера). Только свободное время, чужих записей не видно.
export default function ZapisPage() {
    const today = todayMsk()
    const days = Array.from({ length: SELF_DAYS_AHEAD + 1 }, (_, i) => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10) })
    return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-3 p-4 pb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.webp" alt="Garaggio" className="mx-auto w-40 rounded-2xl" />
            <div className="text-center">
                <h1 className="text-2xl font-black">Запись в Garaggio 🤌</h1>
                <p className="text-sm text-muted">Каждый день с {WORK_DAY.from} до {WORK_DAY.to}. Выберите удобное время — мастер подтвердит запись.</p>
            </div>
            <BookingForm days={days} works={SELF_WORKS.map((w) => ({ id: w.id, label: w.label, minutes: w.minutes }))} />
        </main>
    )
}
