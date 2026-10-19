import 'server-only'
import { sql } from './db'
import { normPlate, type Part, type Powertrain } from './format'

export type Car = {
    id: number; plate: string; vin: string; brand: string; model: string; year: number | null; color: string
    owner_name: string; owner_phone: string; notes: string; created_at: string; powertrain: Powertrain
}
export type Visit = {
    id: number; car_id: number; visit_date: string; mileage: number | null; works: string; parts: Part[]; labor_cost: number
    notes: string; recommendations: string; declined: boolean; next_date: string | null; next_mileage: number | null
    share_token: string | null
}
export type Photo = { id: number; visit_id: number; kind: string; created_at: string }

export async function searchCars(q: string) {
    const n = normPlate(q.trim())
    if (!n) return sql<(Car & { last_visit: string | null })[]>`
        SELECT c.*, (SELECT max(visit_date) FROM visits v WHERE v.car_id = c.id) AS last_visit
        FROM cars c ORDER BY coalesce((SELECT max(created_at) FROM visits v WHERE v.car_id = c.id), c.created_at) DESC LIMIT 50`
    const like = `%${q.trim().toLowerCase()}%`
    const digits = q.replace(/\D/g, '') // телефон ищем по цифрам, без пробелов и дефисов
    return sql<(Car & { last_visit: string | null })[]>`
        SELECT c.*, (SELECT max(visit_date) FROM visits v WHERE v.car_id = c.id) AS last_visit
        FROM cars c
        WHERE c.plate_norm LIKE ${'%' + n + '%'} OR lower(c.owner_name) LIKE ${like} OR lower(c.brand || ' ' || c.model) LIKE ${like}
           OR (length(${digits}) >= 4 AND regexp_replace(c.owner_phone, '[^0-9]', '', 'g') LIKE ${'%' + digits + '%'})
        ORDER BY c.plate LIMIT 50`
}
export async function getCar(id: number) {
    const [car] = await sql<Car[]>`SELECT * FROM cars WHERE id = ${id}`
    return car ?? null
}
export async function getVisits(carId: number) {
    return sql<(Visit & { photo_count: number })[]>`
        SELECT v.*, (SELECT count(*)::int FROM photos p WHERE p.visit_id = v.id) AS photo_count
        FROM visits v WHERE v.car_id = ${carId} ORDER BY v.visit_date DESC, v.id DESC`
}
export async function getVisit(id: number) {
    const [v] = await sql<Visit[]>`SELECT * FROM visits WHERE id = ${id}`
    return v ?? null
}
// Детали, которые уже ставили: для подсказок при вводе и для кнопок типовых работ.
// carParts — этой машине (свежие первыми), allParts — всем машинам (последняя цена/артикул по названию).
export async function getKnownParts(carId: number) {
    const rows = await sql<(Part & { car_id: number })[]>`
        SELECT DISTINCT ON (v.car_id, lower(p->>'name')) p->>'name' AS name, coalesce(p->>'article', '') AS article,
               coalesce((p->>'price')::int, 0) AS price, v.car_id
        FROM visits v, jsonb_array_elements(v.parts) p
        ORDER BY v.car_id, lower(p->>'name'), v.visit_date DESC, v.id DESC`
    const strip = ({ name, article, price }: Part) => ({ name, article, price })
    const carParts = rows.filter((r) => r.car_id === carId).map(strip)
    const seen = new Set<string>()
    const allParts = [...carParts, ...rows.filter((r) => r.car_id !== carId).map(strip)].filter((p) => {
        const k = p.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true
    })
    return { carParts, allParts }
}
export async function getVisitByToken(token: string) {
    if (!/^[\w-]{10,40}$/.test(token)) return null
    const [v] = await sql<Visit[]>`SELECT * FROM visits WHERE share_token = ${token}`
    return v ?? null
}
export async function getPhotos(visitId: number) {
    return sql<Photo[]>`SELECT id, visit_id, kind, created_at FROM photos WHERE visit_id = ${visitId} ORDER BY id`
}

// «Пора на ТО»: последний визит каждой машины, срок по дате или по пробегу.
// Пробег оцениваем по среднему темпу между первым и последним визитом.
export type DueRow = Car & {
    last_date: string; last_mileage: number | null; next_date: string | null; next_mileage: number | null
    km_per_day: number | null; est_mileage: number | null; days_left: number | null; km_left: number | null
}
export async function getDue(withinDays = 14) {
    const rows = await sql<DueRow[]>`
        WITH last AS (
            SELECT DISTINCT ON (car_id) car_id, visit_date AS last_date, mileage AS last_mileage, next_date, next_mileage
            FROM visits ORDER BY car_id, visit_date DESC, id DESC
        ), pace AS (
            SELECT car_id,
                   CASE WHEN max(visit_date) > min(visit_date) AND max(mileage) > min(mileage)
                        THEN (max(mileage) - min(mileage))::float / (max(visit_date) - min(visit_date)) END AS km_per_day
            FROM visits WHERE mileage IS NOT NULL GROUP BY car_id
        )
        SELECT c.*, l.last_date, l.last_mileage, l.next_date, l.next_mileage, p.km_per_day,
               CASE WHEN l.last_mileage IS NOT NULL AND p.km_per_day IS NOT NULL
                    THEN round(l.last_mileage + p.km_per_day * (current_date - l.last_date))::int END AS est_mileage,
               (l.next_date - current_date) AS days_left,
               NULL::int AS km_left
        FROM cars c JOIN last l ON l.car_id = c.id LEFT JOIN pace p ON p.car_id = c.id`
    return rows
        .map((r) => ({ ...r, km_left: r.next_mileage != null && r.est_mileage != null ? r.next_mileage - r.est_mileage : null }))
        .filter((r) => (r.days_left != null && r.days_left <= withinDays) || (r.km_left != null && r.km_left <= 700))
        .sort((a, b) => (a.days_left ?? 9999) - (b.days_left ?? 9999))
}
