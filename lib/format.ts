// Номер: верхний регистр, без пробелов, латиница-двойники → кириллица (А123ВС и A123BC — одно и то же).
const LAT_TO_CYR: Record<string, string> = { A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', Y: 'У', X: 'Х' }
export const normPlate = (s: string) => s.toUpperCase().replace(/[\s\-]/g, '').replace(/[ABEKMHOPCTYX]/g, (c) => LAT_TO_CYR[c] ?? c)

export const rub = (n: number) => `${new Intl.NumberFormat('ru-RU').format(n)} ₽`
export const km = (n: number | null | undefined) => (n == null ? '—' : `${new Intl.NumberFormat('ru-RU').format(n)} км`)
export const dateRu = (d: string | Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
export const toISODate = (d: Date) => d.toISOString().slice(0, 10)
export const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`

export type Part = { name: string; article?: string; price: number }
export const partsTotal = (parts: Part[]) => parts.reduce((s, p) => s + (Number(p.price) || 0), 0)

// Интервал ТО по умолчанию (подставляется в форму визита, можно поменять)
export const DEFAULT_INTERVAL_MONTHS = 6
export const DEFAULT_INTERVAL_KM = 10000
