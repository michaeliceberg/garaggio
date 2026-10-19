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

// VIN: только латиница заглавными и цифры, 17 знаков. Русские буквы переводим:
// похожие по виду (А→A, В→B, Е→E, К→K, М→M, Н→H, Р→P, С→C, Т→T, У→Y, Х→X) — как их видят на телефоне,
// остальные — по той же клавише на английской раскладке (Ц→W, И→B, Ф→A…). В VIN не бывает I, O, Q — это 1 и 0.
const VIN_LOOK: Record<string, string> = { А: 'A', В: 'B', Е: 'E', Ё: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', У: 'Y', Х: 'X' }
const VIN_KEY: Record<string, string> = {
    Й: 'Q', Ц: 'W', Г: 'U', Ш: 'I', Щ: 'O', З: 'P', Ф: 'A', Ы: 'S', П: 'G', Р: 'H', О: 'J', Л: 'K', Д: 'L',
    Я: 'Z', Ч: 'X', И: 'B', Ь: 'M', Б: ',', Ю: '.', Ж: ';', Э: "'", Х: '[', Ъ: ']',
}
export const normVin = (s: string) =>
    s.toUpperCase().split('').map((c) => VIN_LOOK[c] ?? VIN_KEY[c] ?? c).join('')
        .replace(/I/g, '1').replace(/[OQ]/g, '0').replace(/[^A-Z0-9]/g, '').slice(0, 17)
