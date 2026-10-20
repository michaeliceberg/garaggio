import 'server-only'
import { sql } from './db'
import type { Powertrain } from './format'

// Календарь записи. День и время храним московскими (date + time), чтобы не путаться с часовыми поясами.
export type Appt = {
    id: number; car_id: number | null; client_name: string; client_phone: string; day: string; start_time: string
    duration_min: number; work: string; status: 'pending' | 'planned' | 'done' | 'cancelled'; visit_id: number | null
    source: 'master' | 'client'; client_car: string; client_plate: string
    plate: string | null; brand: string | null; model: string | null; owner_name: string | null; owner_phone: string | null
    tg_chat_id: string | null
}
const SELECT = sql`
    SELECT a.id, a.car_id, a.client_name, a.client_phone, a.day::text AS day, to_char(a.start_time, 'HH24:MI') AS start_time,
           a.duration_min, a.work, a.status, a.visit_id, a.source, a.client_car, a.client_plate,
           c.plate, c.brand, c.model, c.owner_name, c.owner_phone, c.tg_chat_id::text AS tg_chat_id
    FROM appointments a LEFT JOIN cars c ON c.id = a.car_id`

// Сегодня по Москве: 'YYYY-MM-DD'
export const todayMsk = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date())
export const nowMskTime = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())

export async function getDay(day: string) {
    return sql<Appt[]>`${SELECT} WHERE a.day = ${day} ORDER BY a.start_time, a.id`
}
export async function getAppt(id: number) {
    const [a] = await sql<Appt[]>`${SELECT} WHERE a.id = ${id}`
    return a ?? null
}
// Сколько записей (не отменённых) по дням — для полоски дней
export async function countByDay(from: string, to: string) {
    const rows = await sql<{ day: string; n: number }[]>`
        SELECT day::text AS day, count(*)::int AS n FROM appointments
        WHERE day BETWEEN ${from} AND ${to} AND status <> 'cancelled' GROUP BY day`
    return Object.fromEntries(rows.map((r) => [r.day, r.n])) as Record<string, number>
}
// Ближайшие записи машины (для карточки)
export async function upcomingForCar(carId: number) {
    return sql<Appt[]>`${SELECT} WHERE a.car_id = ${carId} AND a.status IN ('planned', 'pending') AND a.day >= ${todayMsk()} ORDER BY a.day, a.start_time LIMIT 3`
}
// Пересечения по времени с другими записями того же дня
export async function conflicts(day: string, start: string, duration: number, exceptId?: number) {
    return sql<Appt[]>`${SELECT}
        WHERE a.day = ${day} AND a.status <> 'cancelled' AND a.id <> ${exceptId ?? 0}
          AND a.start_time < (${start}::time + make_interval(mins => ${duration}))
          AND (a.start_time + make_interval(mins => a.duration_min)) > ${start}::time
        ORDER BY a.start_time`
}

export const apptWho = (a: Appt) => a.owner_name || a.client_name || 'Клиент'
export const apptCar = (a: Appt) => [a.brand, a.model].filter(Boolean).join(' ')
export const apptPhone = (a: Appt) => a.owner_phone || a.client_phone
export function endTime(start: string, duration: number) {
    const [h, m] = start.split(':').map(Number)
    const t = h * 60 + m + duration
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
export const DURATIONS = [[30, '30 мин'], [60, '1 час'], [90, '1,5 часа'], [120, '2 часа'], [180, '3 часа'], [240, '4 часа'], [480, 'Весь день']] as const
export const WORK_DAY = { from: '08:00', to: '22:00' } // Ильдар работает 7/7
// Все машины коротко — для выбора в форме записи
export type CarLite = { id: number; plate: string; brand: string; model: string; owner_name: string; owner_phone: string; powertrain: Powertrain }
export async function carsLite() {
    return sql<CarLite[]>`SELECT id, plate, brand, model, owner_name, owner_phone, powertrain FROM cars ORDER BY plate`
}

// Заявки клиентов, которые ждут подтверждения мастера
export async function pendingAppts() {
    return sql<Appt[]>`${SELECT} WHERE a.status = 'pending' AND a.day >= ${todayMsk()} ORDER BY a.day, a.start_time`
}
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
// Свободные начала для самозаписи: шаг 30 минут в рабочие часы, без пересечений с записями и заявками,
// сегодня — не раньше чем через 2 часа от текущего времени.
export async function freeSlots(day: string, duration: number) {
    const busy = await sql<{ s: string; d: number }[]>`
        SELECT to_char(start_time, 'HH24:MI') AS s, duration_min AS d FROM appointments WHERE day = ${day} AND status <> 'cancelled'`
    let from = toMin(WORK_DAY.from)
    if (day === todayMsk()) from = Math.max(from, Math.ceil((toMin(nowMskTime()) + 120) / 30) * 30)
    const out: string[] = []
    for (let t = from; t + duration <= toMin(WORK_DAY.to); t += 30) {
        if (!busy.some((b) => t < toMin(b.s) + b.d && toMin(b.s) < t + duration)) out.push(toHHMM(t))
    }
    return out
}
// Что клиент может выбрать сам и сколько это обычно занимает
export const SELF_WORKS = [
    { id: 'to', label: 'ТО', text: 'Плановое ТО', minutes: 90 },
    { id: 'oil', label: 'Замена масла', text: 'Замена масла в двигателе', minutes: 60 },
    { id: 'tires', label: 'Шиномонтаж', text: 'Шиномонтаж', minutes: 60 },
    { id: 'diag', label: 'Диагностика', text: 'Компьютерная диагностика', minutes: 60 },
    { id: 'brakes', label: 'Тормоза', text: 'Тормоза', minutes: 90 },
    { id: 'other', label: 'Другое', text: '', minutes: 60 },
] as const
export const SELF_DAYS_AHEAD = 14
