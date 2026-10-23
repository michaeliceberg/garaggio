import Link from 'next/link'
import { sql } from '@/lib/db'
import { tgEnabled } from '@/lib/tg'
import { getReminderLog, getReminderSettings, planReminders } from '@/lib/reminders'
import { ReminderControls } from '@/components/reminder-controls'

export const dynamic = 'force-dynamic'

const KIND = { appt: '📅 Завтра запись', due: '🔧 Пора на ТО', due2: '🔧 Повтор про ТО' }
const ago = (d: string) => new Date(d).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Автонапоминания: бот сам пишет клиентам накануне записи и когда пора на ТО.
export default async function RemindersPage() {
    const [settings, plan, log, [subs]] = await Promise.all([
        getReminderSettings(), planReminders(), getReminderLog(),
        sql<{ total: number; tg: number }[]>`SELECT count(*)::int AS total, count(tg_chat_id)::int AS tg FROM cars`,
    ])
    return (
        <>
            <h1 className="text-2xl font-black">🔔 Автонапоминания</h1>
            <p className="text-sm text-muted">Бот сам пишет клиентам в Telegram — вам не нужно помнить. Каждое напоминание приходит один раз, копия — вам в Telegram и в «Ящик».</p>
            {!tgEnabled() && <p className="card p-4 text-tomato">Бот не настроен.</p>}

            <ReminderControls settings={settings} pending={plan.length} />

            <section className="card flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-black">Подписаны на бота</h2>
                    <b className={subs.tg ? 'text-olive' : 'text-gold'}>{subs.tg} из {subs.total} машин</b>
                </div>
                <p className="text-sm text-muted">Напоминания получают только подписанные. Подписать клиента — в карточке машины блок «Telegram»: отправьте ему ссылку или покажите QR.
                    Остальным — как раньше, кнопками WhatsApp/SMS в <Link href="/due" className="text-gold">«Пора на ТО»</Link>.</p>
            </section>

            <section className="card flex flex-col gap-2 p-4">
                <h2 className="font-black">Ждут отправки · {plan.length}</h2>
                {plan.length === 0 ? <p className="text-sm text-muted">Сейчас некому напоминать.</p> : plan.map((r) => (
                    <Link key={r.ref} href={`/cars/${r.carId}`} className="rounded-xl bg-bg p-3 text-sm">
                        <b>{KIND[r.kind]}</b> · {r.car}{r.owner ? ` · ${r.owner}` : ''}
                        <span className="mt-1 block whitespace-pre-wrap text-muted">{r.text}</span>
                    </Link>
                ))}
                <p className="text-xs text-muted">Записи на завтра — после 12:00, «пора на ТО» — с 11:00 до 19:00 по Москве. Если клиент уже записан — про ТО не пишем.</p>
            </section>

            {log.length > 0 && (
                <section className="card flex flex-col gap-2 p-4">
                    <h2 className="font-black">Уже отправлено</h2>
                    {log.map((r) => (
                        <div key={r.id} className="flex justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate">{KIND[r.kind]} · {[r.brand, r.model, r.plate].filter(Boolean).join(' ')}</span>
                            <span className="shrink-0 text-muted">{ago(r.sent_at)}</span>
                        </div>
                    ))}
                </section>
            )}
        </>
    )
}
