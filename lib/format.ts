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

// Тип машины: угадываем по марке/модели, мастер может поменять в карточке.
// ice — бензин (так исторически хранится в базе), diesel — дизель; для обоих одинаковый набор работ
export type Powertrain = 'ice' | 'diesel' | 'hybrid' | 'ev'
export const POWERTRAIN_LABEL: Record<Powertrain, string> = { ice: 'Бензин', diesel: 'Дизель', hybrid: 'Гибрид', ev: 'Электро' }
export const POWERTRAINS: Powertrain[] = ['ice', 'diesel', 'hybrid', 'ev']
const EV_BRANDS = ['zeekr', 'tesla', 'voyah', 'avatr', 'xpeng', 'nio', 'leapmotor', 'polestar', 'neta', 'aito', 'denza', 'evolute', 'moskvich 3e', 'атом', 'atom']
const EV_MODELS = ['e-tron', 'taycan', 'eqs', 'eqe', 'eqc', 'eqa', 'eqb', 'id.3', 'id.4', 'id.6', 'ix3', 'ix', 'i3', 'i4', 'i7', 'leaf', 'ioniq 5', 'ioniq 6', 'ev6', 'ev9', 'han ev', 'seal', 'dolphin']
const HYBRID_HINTS = ['li auto', 'lixiang', 'li ', 'hybrid', 'гибрид', 'prius', 'dm-i', 'phev', 'hev']
export function guessPowertrain(brand: string, model: string): Powertrain {
    const b = brand.trim().toLowerCase(), m = model.trim().toLowerCase(), all = `${b} ${m} `
    if (EV_BRANDS.some((x) => b.startsWith(x)) || EV_MODELS.some((x) => m === x || m.startsWith(x + ' '))) return 'ev'
    if (HYBRID_HINTS.some((x) => all.includes(x))) return 'hybrid'
    return 'ice'
}

// Типовые работы — кнопками над полем «Что сделали». На кнопке короткая подпись, в визит пишется полный текст.
// part — по какому признаку найти деталь, которую ставили раньше (её подставим в «Детали» с артикулом и ценой).
// Порядок: самое частое — первым.
export type WorkPreset = { label: string; text: string; part?: RegExp }
const w = (label: string, text: string, part?: RegExp): WorkPreset => ({ label, text, part })
const ICE_WORKS = [
    w('Масло ДВС', 'Замена масла в двигателе', /^(?!.*(фильтр|редукт|акпп|мкпп|короб|трансм|atf)).*масл/i),
    w('Масляный фильтр', 'Замена масляного фильтра', /фильтр.*масл|масл.*фильтр/i),
    w('Воздушный фильтр', 'Замена воздушного фильтра', /воздуш/i), w('Салонный фильтр', 'Замена салонного фильтра', /салон/i),
    w('Топливный фильтр', 'Замена топливного фильтра', /топлив/i), w('Масло АКПП', 'Замена масла в АКПП', /акпп|atf|dexron/i),
    w('Масло МКПП', 'Замена масла в МКПП', /мкпп/i), w('Свечи', 'Замена свечей зажигания', /свеч/i), w('Антифриз', 'Замена антифриза', /антифриз/i),
]
const GEAR_RE = /редукт|трансмис|gear/i
const GEAR = w('Масло в редукторе', 'Замена масла в редукторе', GEAR_RE)
const EV_WORKS = [
    GEAR, w('Передний редуктор', 'Замена масла в переднем редукторе', GEAR_RE), w('Задний редуктор', 'Замена масла в заднем редукторе', GEAR_RE),
    w('Салонный фильтр', 'Замена салонного фильтра', /салон/i), w('Охлаждение батареи', 'Замена охлаждающей жидкости батареи', /охлажд|антифриз/i),
    w('Проверка ВВ-системы', 'Проверка высоковольтной системы'),
]
const TIRES_FALL = [w('Лето → зима', 'Шиномонтаж: лето → зима'), w('Зима → лето', 'Шиномонтаж: зима → лето')]
const COMMON_WORKS = [
    w('Балансировка', 'Балансировка колёс'), w('Колодки перед', 'Замена передних тормозных колодок', /колодк.*перед|перед.*колодк/i),
    w('Колодки зад', 'Замена задних тормозных колодок', /колодк.*зад|зад.*колодк/i), w('Тормозная жидкость', 'Замена тормозной жидкости', /тормозн.*жидк|dot ?[345]/i),
    w('Дворники', 'Замена щёток стеклоочистителя', /щ[её]тк|дворник/i), w('Диагностика', 'Компьютерная диагностика'),
]
export function workPresets(p: Powertrain) {
    const own = p === 'ev' ? EV_WORKS : p === 'hybrid' ? [...ICE_WORKS.slice(0, 5), GEAR, ...ICE_WORKS.slice(5)] : ICE_WORKS
    // по сезону: осенью первой — «лето → зима», весной — «зима → лето»
    const month = new Date().getMonth()
    const tires = month >= 8 || month <= 1 ? TIRES_FALL : [TIRES_FALL[1], TIRES_FALL[0]]
    return { own, common: [...tires, ...COMMON_WORKS] }
}

// Телефон: всегда «+7 916 099 19 97». 8… и 9… превращаем в +7…; чужие коды (не 7) оставляем просто цифрами с плюсом.
export function formatPhone(s: string) {
    let d = s.replace(/\D/g, '')
    if (!d) return ''
    if (d[0] === '8') d = '7' + d.slice(1)
    else if (d[0] === '9') d = '7' + d
    if (d[0] !== '7') return '+' + d.slice(0, 15)
    const r = d.slice(1, 11)
    return ['+7', r.slice(0, 3), r.slice(3, 6), r.slice(6, 8), r.slice(8, 10)].filter(Boolean).join(' ')
}
