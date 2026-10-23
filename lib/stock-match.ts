// Склад: общие правила для сервера и формы визита — как деталь из визита узнать на складе и сколько списать.
export type StockKind = 'oil' | 'filter'
export type StockItem = { id: number; kind: StockKind; name: string; spec: string; article: string; qty: number; min_qty: number }

export const OIL_SPECS = ['0W-20', '0W-30', '5W-30', '5W-40', '10W-40']
export const FILTER_TYPES = ['масляный', 'воздушный', 'салонный', 'топливный']
export const unitOf = (k: StockKind) => (k === 'oil' ? 'л' : 'шт')
export const fmtQty = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')
export const qtyText = (i: Pick<StockItem, 'kind' | 'qty'>) => `${fmtQty(i.qty)} ${unitOf(i.kind)}`
export const isLow = (i: Pick<StockItem, 'qty' | 'min_qty'>) => i.qty <= 0 || (i.min_qty > 0 && i.qty <= i.min_qty)

// Как деталь будет записана в визит: «Масло Shell Helix Ultra 5W-30, 4 л», «Фильтр масляный Mann W 712/75»
export function itemLabel(i: Pick<StockItem, 'kind' | 'name' | 'spec'>) {
    return i.kind === 'oil' ? ['Масло', i.name, i.spec].filter(Boolean).join(' ') : ['Фильтр', i.spec, i.name].filter(Boolean).join(' ')
}
export function partFromItem(i: StockItem, liters?: number | null): { name: string; article: string; price: number } {
    const base = itemLabel(i)
    return { name: i.kind === 'oil' && liters ? `${base}, ${fmtQty(liters)} л` : base, article: i.article, price: 0 }
}

const flat = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '')
const isOilPart = (n: string) => /масл/i.test(n) && !/фильтр|редукт|акпп|мкпп|короб|раздат|трансм|atf/i.test(n)

// Деталь → позиция склада: сначала по артикулу, потом по названию (у масла — ещё и по вязкости).
// «Масло 5W-30, 4 л» без марки подходит, если масло такой вязкости на складе одно.
export function matchStock(part: { name: string; article?: string }, items: StockItem[]): StockItem | null {
    const art = flat(part.article ?? '')
    if (art) { const byArt = items.find((i) => i.article && flat(i.article) === art); if (byArt) return byArt }
    const n = flat(part.name)
    if (!n) return null
    const oil = isOilPart(part.name)
    const specOk = (i: StockItem) => !i.spec || n.includes(flat(i.spec))
    const byName = items.find((i) => i.name && n.includes(flat(i.name)) && (i.kind === 'oil' ? oil && specOk(i) : !oil))
    if (byName) return byName
    if (oil) {
        const same = items.filter((i) => i.kind === 'oil' && i.spec && n.includes(flat(i.spec)))
        if (same.length === 1) return same[0]
    }
    return null
}

// Сколько списать: литры из названия («4 л», «6,5л») — иначе объём масла машины; фильтры — «2 шт»/«x2», иначе 1.
const num = (s: string) => Number(s.replace(',', '.'))
export function partQty(part: { name: string }, item: Pick<StockItem, 'kind'>, carOilVolume?: string): number | null {
    if (item.kind === 'oil') {
        const m = /(\d+(?:[.,]\d+)?)\s*(?:литр[а-я]*|л|l)(?![a-zа-я])/i.exec(part.name)
        if (m) return num(m[1])
        const v = num((carOilVolume ?? '').match(/\d+(?:[.,]\d+)?/)?.[0] ?? '')
        return v > 0 ? v : null
    }
    const m = /(\d+)\s*шт|[x×х]\s*(\d+)(?![\d.,])/i.exec(part.name)
    return m ? Number(m[1] ?? m[2]) : 1
}
