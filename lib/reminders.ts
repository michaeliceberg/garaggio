import 'server-only'
import { sql } from './db'
import { getDue } from './data'
import { todayMsk } from './appts'
import { BOOKING_URL } from './messages'
import { km } from './format'
import { notifyMasters, sendToClient, tgEnabled } from './tg'
import { bookingLink } from './tg'

// Автонапоминания ботом (запускает cron каждый час: /api/cron/reminders).
// • appt — накануне записи (с 12:00 по Москве), кнопки «Приеду» / «Перенести».
// • due  — «пора на ТО» (до срока ≤ 3 дней или пробег ≤ 700 км), повтор due2 через 14 дней, если так и не записался.
// Пишем только подписанным на бота; одно и то же — один раз (reminder_log.ref). Сообщения видны в «Ящике».
export type ReminderKind = 'appt' | 'due' | 'due2'
export type PlannedReminder = { kind: ReminderKind; ref: string; carId: number; chatId: string; car: string; owner: string; text: string; buttons: Btn[][]; when: string }
type Btn = { text: string; url?: string; callback_data?: string }

const SETTINGS = { appt: 'remind_appt', due: 'remind_due' } as const
export async function getReminderSettings() {
    const rows = await sql<{ key: string; value: string }[]>`SELECT key, value FROM settings WHERE key IN ('remind_appt', 'remind_due')`
    const v = (k: string) => rows.find((r) => r.key === k)?.value === '1'
    return { appt: v(SETTINGS.appt), due: v(SETTINGS.due) }
}
export async function setReminderSetting(kind: 'appt' | 'due', on: boolean) {
    await sql`INSERT INTO settings (key, value) VALUES (${SETTINGS[kind]}, ${on ? '1' : '0'}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`
}

const mskHour = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', hour: '2-digit', hour12: false }).format(new Date()))
// date из postgres приходит объектом Date (полночь UTC) — приводим к 'YYYY-MM-DD'
const iso = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10))
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const hello = (owner: string) => (owner ? `Чао, ${owner.split(' ')[0]}!` : 'Чао!')
const carName = (c: { brand: string | null; model: string | null }) => [c.brand, c.model].filter(Boolean).join(' ')
const dayLong = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
const dayShort = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC', day: 'numeric', month: 'long' })

// «Замена масла» → «замена масла», но «ТО», «АКПП» оставляем заглавными
const lowerFirst = (w: string) => (/^[A-ZА-ЯЁ]{2,}/.test(w) ? w : w.charAt(0).toLowerCase() + w.slice(1))
export const apptReminderText = (owner: string, car: string, day: string, time: string, work: string) => {
    const ls = work.split('\n').map((l) => l.trim()).filter(Boolean)
    const what = ls.length ? ` — ${ls.slice(0, 3).map(lowerFirst).join(', ')}` : ''
    return `${hello(owner)} Это Garaggio 🤌 Напоминаем: завтра, ${dayLong(day)}, в ${time} ждём вас${car ? ` на ${car}` : ''}${what}.\n\nВсё в силе?`
}
export const apptButtons = (id: number): Btn[][] => [[{ text: '✅ Приеду', callback_data: `ap:yes:${id}` }, { text: '🔁 Перенести', callback_data: `ap:move:${id}` }]]
export const dueReminderText = (owner: string, car: string, why: string, again = false) =>
    again
        ? `${hello(owner)} Это снова Garaggio 🤌 Напоминаем про ТО${car ? ` для ${car}` : ''}${why ? ` (${why})` : ''}. Выберите удобное время кнопкой ниже — или просто ответьте сюда.`
        : `${hello(owner)} Это Garaggio 🤌 ${car ? `Вашему ${car} пора` : 'Пора'} на техобслуживание${why ? ` (${why})` : ''}. Выберите удобное время кнопкой ниже — или просто ответьте сюда, Маэстро подберёт.`
export const dueButtons: Btn[][] = [[{ text: '📅 Записаться онлайн', url: BOOKING_URL }]]

// Что бот отправил бы прямо сейчас (без учёта часов и включателей — их проверяет runReminders)
export async function planReminders(): Promise<PlannedReminder[]> {
    const today = todayMsk(), tomorrow = addDays(today, 1)
    const out: PlannedReminder[] = []
    const sent = new Set((await sql<{ ref: string }[]>`SELECT ref FROM reminder_log`).map((r) => r.ref))

    const appts = await sql<{ id: number; car_id: number; day: string; start_time: string; work: string; chat: string; brand: string; model: string; owner_name: string; plate: string }[]>`
        SELECT a.id, a.car_id, a.day::text AS day, to_char(a.start_time, 'HH24:MI') AS start_time, a.work,
               c.tg_chat_id::text AS chat, c.brand, c.model, c.owner_name, c.plate
        FROM appointments a JOIN cars c ON c.id = a.car_id
        WHERE a.status = 'planned' AND a.day = ${tomorrow} AND c.tg_chat_id IS NOT NULL ORDER BY a.start_time`
    for (const a of appts) {
        const ref = `appt:${a.id}:${a.day}:${a.start_time}`
        if (sent.has(ref)) continue
        out.push({ kind: 'appt', ref, carId: a.car_id, chatId: a.chat, car: `${carName(a)} ${a.plate}`.trim(), owner: a.owner_name, when: `запись завтра в ${a.start_time}`,
            text: apptReminderText(a.owner_name, carName(a), a.day, a.start_time, a.work), buttons: apptButtons(a.id) })
    }

    const due = (await getDue(3)).filter((c) => c.tg_chat_id)
    const booked = new Set((await sql<{ car_id: number }[]>`SELECT DISTINCT car_id FROM appointments WHERE car_id IS NOT NULL AND status IN ('planned', 'pending') AND day >= ${today}`).map((r) => r.car_id))
    const firstSent = new Map((await sql<{ ref: string; sent_at: Date }[]>`SELECT ref, sent_at FROM reminder_log WHERE kind = 'due'`).map((r) => [r.ref, r.sent_at]))
    for (const c of due) {
        if (booked.has(c.id)) continue
        const cycle = `${c.id}:${iso(c.last_date)}`
        const why = c.km_left != null && c.km_left <= 700 && (c.days_left == null || c.days_left > 3)
            ? (c.est_mileage ? `пробег уже около ${km(c.est_mileage)}` : 'по пробегу')
            : c.next_date ? (c.days_left! <= 0 ? `срок был ${dayShort(iso(c.next_date))}` : `до ${dayShort(iso(c.next_date))}`) : ''
        const base = { carId: c.id, chatId: String(c.tg_chat_id), car: `${carName(c)} ${c.plate}`.trim(), owner: c.owner_name, buttons: [[{ text: '📅 Записаться онлайн', url: bookingLink(String(c.tg_chat_id)) }]] as Btn[][] }
        const first = firstSent.get(`due:${cycle}`)
        if (!first) out.push({ ...base, kind: 'due', ref: `due:${cycle}`, when: 'пора на ТО', text: dueReminderText(c.owner_name, carName(c), why) })
        else if (Date.now() - new Date(first).getTime() >= 14 * 86400_000 && !sent.has(`due2:${cycle}`))
            out.push({ ...base, kind: 'due2', ref: `due2:${cycle}`, when: 'повтор: не записался за 2 недели', text: dueReminderText(c.owner_name, carName(c), why, true) })
    }
    return out
}

// Отправка (cron раз в час). Записи — с 12:00 до 21:00, «пора на ТО» — с 11:00 до 19:00 по Москве; не больше 20 за раз.
export async function runReminders(opts: { ignoreHours?: boolean } = {}) {
    if (!tgEnabled()) return { sent: 0, failed: 0 }
    const on = await getReminderSettings()
    const h = mskHour()
    const list = (await planReminders()).filter((r) => r.kind === 'appt'
        ? on.appt && (opts.ignoreHours || (h >= 12 && h < 21))
        : on.due && (opts.ignoreHours || (h >= 11 && h < 19))).slice(0, 20)
    const done: PlannedReminder[] = []
    let failed = 0
    for (const r of list) {
        // сначала занимаем ref — если cron запустится дважды, второй не отправит повторно
        const [claimed] = await sql<{ id: number }[]>`INSERT INTO reminder_log (kind, ref, car_id, chat_id, text) VALUES (${r.kind}, ${r.ref}, ${r.carId}, ${r.chatId}, ${r.text}) ON CONFLICT (ref) DO NOTHING RETURNING id`
        if (!claimed) continue
        try { await sendToClient(r.chatId, r.text, { reply_markup: { inline_keyboard: r.buttons } }); done.push(r) }
        catch (e) { failed++; console.error('reminder', r.ref, e); await sql`DELETE FROM reminder_log WHERE id = ${claimed.id}` }
    }
    if (done.length) await notifyMasters(`🔔 Бот напомнил клиентам:\n${done.map((r) => `• ${r.car}${r.owner ? ` (${r.owner})` : ''} — ${r.when}`).join('\n')}`)
    return { sent: done.length, failed }
}

export async function getReminderLog(limit = 30) {
    return sql<{ id: number; kind: ReminderKind; car_id: number | null; text: string; sent_at: string; plate: string | null; brand: string | null; model: string | null }[]>`
        SELECT r.id, r.kind, r.car_id, r.text, r.sent_at, c.plate, c.brand, c.model
        FROM reminder_log r LEFT JOIN cars c ON c.id = r.car_id ORDER BY r.sent_at DESC LIMIT ${limit}`
}
