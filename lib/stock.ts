import 'server-only'
import { sql } from './db'
import type { Part } from './format'
import { matchStock, partQty, type StockItem } from './stock-match'

const ITEM_COLS = sql`id, kind, name, spec, article, qty::float8 AS qty, min_qty::float8 AS min_qty`

export async function getStock(): Promise<StockItem[]> {
    return sql<StockItem[]>`SELECT ${ITEM_COLS} FROM stock_items ORDER BY kind, spec, name`
}

export type StockMove = { id: number; item_id: number; delta: number; reason: string; visit_id: number | null; created_at: string; plate: string | null }
export async function getRecentMoves(limit = 300): Promise<StockMove[]> {
    return sql<StockMove[]>`
        SELECT m.id, m.item_id, m.delta::float8 AS delta, m.reason, m.visit_id, m.created_at, c.plate
        FROM stock_moves m LEFT JOIN visits v ON v.id = m.visit_id LEFT JOIN cars c ON c.id = v.car_id
        ORDER BY m.created_at DESC, m.id DESC LIMIT ${limit}`
}

// Что списано визитом (для страницы визита)
export async function getVisitMoves(visitId: number) {
    return sql<(StockItem & { delta: number })[]>`
        SELECT i.id, i.kind, i.name, i.spec, i.article, i.qty::float8 AS qty, i.min_qty::float8 AS min_qty, m.delta::float8 AS delta
        FROM stock_moves m JOIN stock_items i ON i.id = m.item_id WHERE m.visit_id = ${visitId} ORDER BY m.id`
}

// Списание деталей визита. При правке визита старое списание возвращаем и считаем заново — склад всегда совпадает с визитом.
export async function syncVisitStock(visitId: number, carId: number, parts: Part[]) {
    await sql.begin(async (tx) => {
        const old = await tx<{ item_id: number; delta: number }[]>`DELETE FROM stock_moves WHERE visit_id = ${visitId} AND reason = 'visit' RETURNING item_id, delta::float8 AS delta`
        for (const m of old) await tx`UPDATE stock_items SET qty = qty - ${m.delta} WHERE id = ${m.item_id}`
        if (!parts.length) return
        const items = await tx<StockItem[]>`SELECT ${ITEM_COLS} FROM stock_items`
        if (!items.length) return
        const [car] = await tx<{ oil_volume: string }[]>`SELECT oil_volume FROM cars WHERE id = ${carId}`
        for (const p of parts) {
            const item = matchStock(p, items)
            const q = item ? partQty(p, item, car?.oil_volume) : null
            if (!item || !q) continue
            await tx`INSERT INTO stock_moves (item_id, delta, reason, visit_id) VALUES (${item.id}, ${-q}, 'visit', ${visitId})`
            await tx`UPDATE stock_items SET qty = qty - ${q} WHERE id = ${item.id}`
        }
    })
}
// Визит удаляют — списанное возвращаем на склад
export async function returnVisitStock(visitId: number) {
    await sql.begin(async (tx) => {
        const old = await tx<{ item_id: number; delta: number }[]>`DELETE FROM stock_moves WHERE visit_id = ${visitId} AND reason = 'visit' RETURNING item_id, delta::float8 AS delta`
        for (const m of old) await tx`UPDATE stock_items SET qty = qty - ${m.delta} WHERE id = ${m.item_id}`
    })
}
