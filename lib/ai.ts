import 'server-only'
import { shortBrand } from './car-dicts'
import Anthropic from '@anthropic-ai/sdk'

// Разбор надиктованного мастером текста в поля визита (Claude Haiku, ответ строго по схеме через tool use).
// Сервер в России ходит к Anthropic через прокси (ANTHROPIC_BASE_URL в .env), SDK подхватывает его сам.
export type VoiceParsed = {
    works: string[]
    parts: { name: string; article: string; price: number }[]
    labor_cost: number | null
    mileage: number | null
    notes: string
    recommendations: string
}

const SYSTEM = `Ты помощник автомеханика. Тебе дают текст, который мастер надиктовал голосом после работы с машиной (распознавание речи, возможны ошибки и числа словами).
Разложи его по полям визита:
- works: список выполненных работ короткими стандартными фразами с заглавной буквы, например «Замена масла в двигателе», «Замена салонного фильтра», «Шиномонтаж: лето → зима», «Замена передних тормозных колодок».
- parts: установленные детали и расходники. name — что и сколько («Масло Shell Helix 5W-30, 4 л», «Фильтр масляный Mann W 712/75»), article — артикул, если назван, иначе пусто, price — цена в рублях числом, если названа, иначе 0.
- labor_cost: стоимость работы в рублях, если названа, иначе null.
- mileage: пробег в км, если назван, иначе null.
- recommendations: что мастер советует сделать в будущем («скоро менять колодки»), иначе пусто.
- notes: прочие важные нюансы работы, которые мастер сам назвал (не повторяй марку машины и то, что уже есть в других полях), иначе пусто.
Числа словами переводи в цифры: «четыре пятьсот» = 4500, «две тысячи» = 2000, «сто двадцать пять тысяч» = 125000. Ничего не выдумывай.`

const TOOL: Anthropic.Tool = {
    name: 'save_visit',
    description: 'Сохранить разобранные поля визита',
    input_schema: {
        type: 'object',
        properties: {
            works: { type: 'array', items: { type: 'string' } },
            parts: {
                type: 'array',
                items: { type: 'object', properties: { name: { type: 'string' }, article: { type: 'string' }, price: { type: 'number' } }, required: ['name', 'article', 'price'] },
            },
            labor_cost: { type: ['number', 'null'] },
            mileage: { type: ['number', 'null'] },
            notes: { type: 'string' },
            recommendations: { type: 'string' },
        },
        required: ['works', 'parts', 'labor_cost', 'mileage', 'notes', 'recommendations'],
    },
}

export async function parseVoiceText(text: string, carInfo: string): Promise<VoiceParsed> {
    const client = new Anthropic()
    const res = await client.messages.create({
        model: 'claude-haiku-5-5',
        max_tokens: 1500,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'save_visit' },
        messages: [{ role: 'user', content: `Машина: ${carInfo}\n\nНадиктовано:\n${text}` }],
    })
    const block = res.content.find((b) => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') throw new Error('no tool_use')
    const v = block.input as VoiceParsed
    return {
        works: (v.works ?? []).map(String).filter(Boolean),
        parts: (v.parts ?? []).map((p) => ({ name: String(p.name ?? ''), article: String(p.article ?? ''), price: Math.round(Number(p.price) || 0) })).filter((p) => p.name),
        labor_cost: v.labor_cost == null ? null : Math.round(Number(v.labor_cost) || 0),
        mileage: v.mileage == null ? null : Math.round(Number(v.mileage) || 0),
        notes: String(v.notes ?? ''),
        recommendations: String(v.recommendations ?? ''),
    }
}

// Распознавание машины по фото: госномер, СТС/ПТС, табличка с VIN, лобовое стекло.
// Картинку передаём ссылкой (imageUrl) — через прокси большие запросы рвутся; локально без прокси можно base64.
export type CarFromPhoto = { plate: string; vin: string; brand: string; model: string; year: number | null; color: string }
const CAR_TOOL: Anthropic.Tool = {
    name: 'car_data',
    description: 'Данные машины, найденные на фото',
    input_schema: {
        type: 'object',
        properties: {
            plate: { type: 'string', description: 'Госномер как на табличке, например А123ВС77, иначе пусто' },
            vin: { type: 'string', description: '17 знаков VIN, иначе пусто' },
            brand: { type: 'string' }, model: { type: 'string' },
            year: { type: ['number', 'null'] }, color: { type: 'string', description: 'цвет по-русски маленькими буквами' },
        },
        required: ['plate', 'vin', 'brand', 'model', 'year', 'color'],
    },
}
const CAR_SYSTEM = `Тебе присылают фото машины, её госномера, свидетельства о регистрации (СТС), ПТС или таблички с VIN.
Выпиши то, что видно. Госномер РФ: буквы только А В Е К М Н О Р С Т У Х, пиши их кириллицей, без пробелов, с регионом (А123ВС777).
VIN — ровно 17 знаков, латиница и цифры, без букв I, O, Q. Если поле не видно или не уверен — оставь пусто (год — null). Ничего не выдумывай.
Марку пиши латиницей как принято (Mercedes, Toyota, Zeekr — Mercedes без «-Benz»), модель — как на документе.`
export async function recognizeCar(image: { url: string } | { base64: string }, model = 'claude-haiku-5-5'): Promise<CarFromPhoto> {
    const client = new Anthropic()
    const source: Anthropic.ImageBlockParam['source'] = 'url' in image
        ? { type: 'url', url: image.url }
        : { type: 'base64', media_type: 'image/jpeg', data: image.base64 }
    const res = await client.messages.create({
        model, max_tokens: 400, system: CAR_SYSTEM, tools: [CAR_TOOL], tool_choice: { type: 'tool', name: 'car_data' },
        messages: [{ role: 'user', content: [{ type: 'image', source }, { type: 'text', text: 'Что видно на фото?' }] }],
    })
    const block = res.content.find((b) => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') throw new Error('no tool_use')
    const v = block.input as CarFromPhoto
    const year = Math.round(Number(v.year) || 0)
    return {
        plate: String(v.plate ?? '').toUpperCase().replace(/\s/g, ''), vin: String(v.vin ?? ''), brand: shortBrand(String(v.brand ?? '')),
        model: String(v.model ?? ''), year: year > 1950 && year < 2100 ? year : null, color: String(v.color ?? '').toLowerCase(),
    }
}
