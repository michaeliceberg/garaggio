import 'server-only'
import { sql } from './db'
import { getCar, getKnownParts, getWishes, type Car } from './data'
import { oilLine, workPresets, type WorkPreset } from './format'
import { todayMsk, type Appt } from './appts'
import { getStock } from './stock'
import { matchStock, partQty, qtyText, type StockItem } from './stock-match'

// «Что заказать к ТО»: по записям в календаре на ближайшие дни собираем, какие детали и масло нужны каждой машине.
// Откуда берём: работы из записи; если записано «ТО»/«масло» или ничего — работы прошлого ТО этой машины.
// Работа → типовая работа (кнопки визита) → деталь, которую ставили этой машине раньше (артикул, цена), иначе другой машине.
export type OrderItem = {
    key: string; work: string; name: string; article: string; price: number; source: 'car' | 'other' | 'none'; oil?: boolean
    // склад: что подходит из остатков и сколько нужно на эту машину (масло — литры по объёму в карточке)
    stockId?: number; stockText?: string; need?: number; oilSpec?: string
}
export type OrderCard = {
    appt: { id: number; day: string; start_time: string; work: string; parts_ordered: boolean; status: string }
    car: Pick<Car, 'id' | 'plate' | 'brand' | 'model' | 'owner_name'>
    items: OrderItem[]
    unknown: string[] // строки записи, для которых не нашлось типовой работы — уточнить
    fromLastVisit: string | null // дата прошлого ТО, если работы взяли оттуда
    recommendations: string
    wishes: string[]
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
const IS_TO = /(^|\s)то(\s|$)|техобслуж|плановое|масл/i

function presetFor(line: string, presets: WorkPreset[]) {
    const l = norm(line)
    return presets.find((p) => norm(p.text) === l) ?? presets.find((p) => l.includes(norm(p.text)) || l.includes(norm(p.label)))
}

export async function buildOrders(days = 7): Promise<OrderCard[]> {
    const today = todayMsk()
    const to = new Date(today + 'T12:00:00Z'); to.setUTCDate(to.getUTCDate() + days)
    const appts = await sql<(Pick<Appt, 'id' | 'car_id' | 'day' | 'start_time' | 'work' | 'status'> & { parts_ordered: boolean })[]>`
        SELECT id, car_id, day::text AS day, to_char(start_time, 'HH24:MI') AS start_time, work, status, parts_ordered
        FROM appointments WHERE car_id IS NOT NULL AND status IN ('planned', 'pending') AND day BETWEEN ${today} AND ${to.toISOString().slice(0, 10)}
        ORDER BY day, start_time`
    const cards: OrderCard[] = []
    const stock = appts.length ? await getStock() : []
    for (const a of appts) {
        const car = await getCar(a.car_id!)
        if (!car) continue
        const [known, wishes, [last]] = await Promise.all([
            getKnownParts(car.id), getWishes(car.id, true),
            sql<{ visit_date: string; works: string; recommendations: string }[]>`
                SELECT visit_date::text, works, recommendations FROM visits WHERE car_id = ${car.id} ORDER BY visit_date DESC, id DESC LIMIT 1`,
        ])
        const presets = (({ own, common }) => [...own, ...common])(workPresets(car.powertrain))
        const lines = a.work.split('\n').map((s) => s.trim()).filter(Boolean)
        const wanted: string[] = []
        const unknown: string[] = []
        let fromLastVisit: string | null = null
        for (const l of lines) { const p = presetFor(l, presets); if (p) wanted.push(p.text); else if (!IS_TO.test(l)) unknown.push(l) }
        // «ТО», «масло» или пустая запись — берём то, что делали на прошлом ТО (визит с заменой масла)
        if (!lines.length || lines.some((l) => IS_TO.test(l))) {
            const [prevTo] = await sql<{ visit_date: string; works: string }[]>`
                SELECT visit_date::text, works FROM visits WHERE car_id = ${car.id} AND works ~* 'масл' ORDER BY visit_date DESC, id DESC LIMIT 1`
            if (prevTo) {
                fromLastVisit = prevTo.visit_date
                for (const l of prevTo.works.split('\n')) { const p = presetFor(l, presets); if (p) wanted.push(p.text) }
            } else if (car.powertrain !== 'ev') wanted.push('Замена масла в двигателе', 'Замена масляного фильтра')
        }
        const items: OrderItem[] = []
        for (const text of Array.from(new Set(wanted))) {
            const p = presets.find((x) => x.text === text)!
            if (!p.part) continue // шиномонтаж, диагностика, балансировка — заказывать нечего
            const mine = known.carParts.find((x) => p.part!.test(x.name))
            const other = mine ? null : known.allParts.find((x) => p.part!.test(x.name))
            const found = mine ?? other
            const oil = /двигател/.test(text) && /масл/i.test(text)
            const oilInfo = oil ? oilLine({ oil_spec: car.oil_spec, oil_volume: car.oil_volume }) : ''
            const item: OrderItem = {
                key: `${a.id}-${p.label}`, work: p.label, oil,
                name: oil && oilInfo ? `Масло ${oilInfo}${mine ? ` (${mine.name})` : ''}` : found?.name ?? `${p.label}: подобрать`,
                article: (oil && !mine ? '' : found?.article) ?? '', price: (oil && !mine ? 0 : found?.price) ?? 0,
                source: mine ? 'car' : oil && oilInfo ? 'car' : other ? 'other' : 'none',
            }
            withStock(item, stock, oil ? car : null, found ?? null)
            items.push(item)
        }
        cards.push({
            appt: { id: a.id, day: a.day, start_time: a.start_time, work: a.work, parts_ordered: a.parts_ordered, status: a.status },
            car: { id: car.id, plate: car.plate, brand: car.brand, model: car.model, owner_name: car.owner_name },
            items, unknown, fromLastVisit, recommendations: last?.recommendations ?? '', wishes: wishes.map((w) => w.text),
        })
    }
    return cards
}

// Подбираем позицию склада: масло — та, что ставили этой машине, иначе любое масло подходящей вязкости (где больше осталось);
// фильтры и прочее — по прошлой детали (артикул/название).
function withStock(item: OrderItem, stock: StockItem[], oilCar: Pick<Car, 'oil_spec' | 'oil_volume'> | null, found: { name: string; article?: string } | null) {
    if (!stock.length) return
    let s: StockItem | null = found ? matchStock(found, stock) : null
    if (oilCar) {
        const specs = oilCar.oil_spec.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean)
        if (s && (s.kind !== 'oil' || (specs.length && !specs.includes(s.spec.toUpperCase())))) s = null
        if (!s && specs.length) s = stock.filter((i) => i.kind === 'oil' && specs.includes(i.spec.toUpperCase())).sort((x, y) => y.qty - x.qty)[0] ?? null
        item.oilSpec = s?.spec || specs[0]
        item.need = partQty({ name: '' }, { kind: 'oil' }, oilCar.oil_volume) ?? undefined
    } else if (s) item.need = 1
    if (s) { item.stockId = s.id; item.stockText = qtyText(s) }
}
