'use server'

import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { checkPassword, endSession, requireAuth } from '@/lib/auth'
import { parseVoiceText, type VoiceParsed } from '@/lib/ai'
import { getMasters, notifyMasters, removeMaster, sendToClient, sendVoiceToClient, tgSend } from '@/lib/tg'
import { synthesize } from '@/lib/tts'
import { apptCar, apptWho, conflicts, endTime } from '@/lib/appts'
import { apptText } from '@/lib/messages'
import { shortBrand } from '@/lib/car-dicts'
import { syncVisitStock, returnVisitStock } from '@/lib/stock'
import { apptButtons, apptReminderText, dueButtons, dueReminderText, runReminders, setReminderSetting } from '@/lib/reminders'
import { FILTER_TYPES, OIL_SPECS, type StockKind } from '@/lib/stock-match'
import { parseStockText, type StockParsed } from '@/lib/ai'
import { POWERTRAINS, formatPhone, guessPowertrain, normPlate, normVin, type Part } from '@/lib/format'

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const int = (f: FormData, k: string) => { const v = str(f, k).replace(/\s/g, ''); return v === '' ? null : Math.round(Number(v)) || null }

export async function logout() { endSession(); redirect('/login') }

export async function saveCar(f: FormData) {
    requireAuth()
    const id = int(f, 'id')
    const plate = str(f, 'plate').toUpperCase()
    const v = {
        plate, plate_norm: normPlate(plate), vin: normVin(str(f, 'vin')), brand: shortBrand(str(f, 'brand')), model: str(f, 'model'),
        year: int(f, 'year'), color: str(f, 'color'),
        powertrain: (POWERTRAINS as string[]).includes(str(f, 'powertrain')) ? str(f, 'powertrain') : guessPowertrain(str(f, 'brand'), str(f, 'model')), owner_name: str(f, 'owner_name'), owner_phone: formatPhone(str(f, 'owner_phone')),
        owner_address: str(f, 'owner_address'), owner_job: str(f, 'owner_job'), notes: str(f, 'notes'),
        oil_spec: str(f, 'oil_spec').toUpperCase(), oil_volume: str(f, 'oil_volume').replace('.', ','), oil_method: ['drain', 'suck'].includes(str(f, 'oil_method')) ? str(f, 'oil_method') : '', oil_note: str(f, 'oil_note'),
    }
    let carId = id
    if (id) await sql`UPDATE cars SET ${sql(v)} WHERE id = ${id}`
    else [{ id: carId }] = await sql<{ id: number }[]>`INSERT INTO cars ${sql(v)} RETURNING id`
    await saveCarPhoto(carId!, str(f, 'photo_data'), str(f, 'photo_remove') === '1')
    const appt = int(f, 'appt') // машину завели из записи в календаре — привязываем запись
    if (appt) { await sql`UPDATE appointments SET car_id = ${carId}, client_name = '', client_phone = '' WHERE id = ${appt}`; revalidatePath('/calendar') }
    revalidatePath('/')
    redirect(`/cars/${carId}`)
}
// Аватарка машины: из формы приходит уже сжатое фото (data:image/jpeg;base64,…). Старый файл удаляем.
async function saveCarPhoto(carId: number, dataUrl: string, remove = false) {
    const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(dataUrl)
    if (!m && !remove) return
    const [old] = await sql<{ photo: string }[]>`SELECT photo FROM cars WHERE id = ${carId}`
    let rel = ''
    if (m) {
        const buf = Buffer.from(m[2], 'base64')
        if (buf.length > 3 * 1024 * 1024) return
        rel = `cars/${carId}/${crypto.randomUUID()}.jpg`
        const abs = path.join(process.env.UPLOAD_DIR!, rel)
        await fs.mkdir(path.dirname(abs), { recursive: true })
        await fs.writeFile(abs, buf)
    }
    await sql`UPDATE cars SET photo = ${rel} WHERE id = ${carId}`
    if (old?.photo) await fs.rm(path.join(process.env.UPLOAD_DIR!, old.photo), { force: true })
}
// Фото машины прямо с карточки (нажали на аватарку)
export async function setCarPhoto(carId: number, dataUrl: string) {
    requireAuth()
    await saveCarPhoto(carId, dataUrl, !dataUrl)
    revalidatePath('/')
    revalidatePath(`/cars/${carId}`)
}
// Удаление машины и визита — только с паролем мастера (защита от случайного нажатия). Возвращает текст ошибки.
const WRONG_PW = 'Неверный пароль'
export async function deleteCar(_prev: string | null, f: FormData): Promise<string | null> {
    requireAuth()
    if (!checkPassword(str(f, 'password'))) return WRONG_PW
    const id = int(f, 'id')
    if (id) {
        const files = await sql<{ file: string }[]>`SELECT p.file FROM photos p JOIN visits v ON v.id = p.visit_id WHERE v.car_id = ${id}
            UNION ALL SELECT photo FROM cars WHERE id = ${id} AND photo <> ''`
        await sql`DELETE FROM cars WHERE id = ${id}`
        await Promise.all(files.map((x) => fs.rm(path.join(process.env.UPLOAD_DIR!, x.file), { force: true })))
    }
    redirect('/')
}

// Визит создаётся/правится из клиентской формы: возвращаем id, фото форма догружает следом.
export async function saveVisit(input: {
    id?: number; car_id: number; visit_date: string; mileage: number | null; works: string; parts: Part[]; labor_cost: number
    notes: string; recommendations: string; declined: boolean; paid: boolean; next_date: string | null; next_mileage: number | null
    appt_id?: number | null // визит начат из записи в календаре — отмечаем её «приехал»
}) {
    requireAuth()
    const parts = input.parts.filter((p) => p.name.trim()).map((p) => ({ name: p.name.trim(), article: (p.article ?? '').trim(), price: Math.round(Number(p.price) || 0) }))
    const v = {
        car_id: input.car_id, visit_date: input.visit_date, mileage: input.mileage, works: input.works.trim(), parts: sql.json(parts),
        labor_cost: Math.round(input.labor_cost || 0), notes: input.notes.trim(), recommendations: input.recommendations.trim(),
        declined: input.declined, paid: input.paid, next_date: input.next_date || null, next_mileage: input.next_mileage,
    }
    if (input.id) {
        await sql`UPDATE visits SET ${sql(v)} WHERE id = ${input.id}`
        await syncVisitStock(input.id, input.car_id, parts)
        revalidatePath(`/cars/${input.car_id}`); revalidatePath('/stock')
        return input.id
    }
    const [{ id }] = await sql<{ id: number }[]>`INSERT INTO visits ${sql(v)} RETURNING id`
    await syncVisitStock(id, input.car_id, parts) // масло и фильтры со склада списываются сами
    revalidatePath('/stock')
    // пожелания владельца показывались в шапке нового визита — после сохранения считаем их учтёнными (клиент видит «Маэстро учёл»)
    await sql`UPDATE car_wishes SET done = true WHERE car_id = ${input.car_id} AND NOT done`
    if (input.appt_id) {
        await sql`UPDATE appointments SET status = 'done', visit_id = ${id}, car_id = ${input.car_id} WHERE id = ${input.appt_id}`
        revalidatePath('/calendar')
    }
    revalidatePath(`/cars/${input.car_id}`)
    return id
}
// Голосовой ввод: распознанный телефоном текст → поля визита. null — нейросеть недоступна (форма просто вставит текст).
export async function parseVoice(text: string, carId: number): Promise<VoiceParsed | null> {
    requireAuth()
    if (!process.env.ANTHROPIC_API_KEY || !text.trim()) return null
    const [car] = await sql<{ brand: string; model: string; powertrain: string }[]>`SELECT brand, model, powertrain FROM cars WHERE id = ${carId}`
    try {
        return await parseVoiceText(text.slice(0, 4000), car ? `${car.brand} ${car.model} (${car.powertrain})` : 'неизвестно')
    } catch (e) {
        console.error('parseVoice', e)
        return null
    }
}

// Ссылка «отчёт клиенту»: случайный токен, один на визит (повторный вызов — та же ссылка).
export async function ensureShareToken(visitId: number) {
    requireAuth()
    const [v] = await sql<{ share_token: string | null }[]>`SELECT share_token FROM visits WHERE id = ${visitId}`
    if (!v) throw new Error('no visit')
    if (v.share_token) return v.share_token
    const token = crypto.randomBytes(12).toString('base64url')
    await sql`UPDATE visits SET share_token = ${token} WHERE id = ${visitId}`
    return token
}
export async function setPaid(visitId: number, paid: boolean) {
    requireAuth()
    const [v] = await sql<{ car_id: number }[]>`UPDATE visits SET paid = ${paid} WHERE id = ${visitId} RETURNING car_id`
    revalidatePath('/money'); if (v) revalidatePath(`/cars/${v.car_id}`); revalidatePath(`/visits/${visitId}`)
}
export async function deleteVisit(_prev: string | null, f: FormData): Promise<string | null> {
    requireAuth()
    if (!checkPassword(str(f, 'password'))) return WRONG_PW
    const id = int(f, 'id'), carId = int(f, 'car_id')
    if (id) {
        const files = await sql<{ file: string }[]>`SELECT file FROM photos WHERE visit_id = ${id}`
        await returnVisitStock(id)
        await sql`DELETE FROM visits WHERE id = ${id}`
        revalidatePath('/stock')
        await Promise.all(files.map((x) => fs.rm(path.join(process.env.UPLOAD_DIR!, x.file), { force: true })))
    }
    redirect(`/cars/${carId}`)
}
export async function deletePhoto(f: FormData) {
    requireAuth()
    const id = int(f, 'id'), visitId = int(f, 'visit_id')
    const [p] = await sql<{ file: string }[]>`DELETE FROM photos WHERE id = ${id} RETURNING file`
    if (p) await fs.rm(path.join(process.env.UPLOAD_DIR!, p.file), { force: true })
    redirect(`/visits/${visitId}`)
}

// Telegram: написать клиенту через бота (по машине или по чату из «Ящика»)
export async function tgToCar(carId: number, text: string) {
    requireAuth()
    const t = text.trim()
    if (!t) return { error: 'Пустое сообщение' }
    const [car] = await sql<{ tg_chat_id: string | null }[]>`SELECT tg_chat_id::text FROM cars WHERE id = ${carId}`
    if (!car?.tg_chat_id) return { error: 'Клиент не подписан на бота' }
    return tgToChat(car.tg_chat_id, t)
}
export async function tgToChat(chatId: string, text: string) {
    requireAuth()
    const t = text.trim()
    if (!t || !/^-?\d+$/.test(chatId)) return { error: 'Пустое сообщение' }
    try { await sendToClient(chatId, t) } catch (e) { return { error: (e as Error).message } }
    const [c] = await sql<{ name: string }[]>`SELECT name FROM tg_chats WHERE chat_id = ${chatId}`
    await notifyMasters(`↪️ Ответ из приложения${c?.name ? ` (${c.name})` : ''}:\n${t}`) // мастера в Telegram видят, что клиенту ответили
    revalidatePath('/inbox'); revalidatePath(`/inbox/${chatId}`)
    return { ok: true }
}
export async function tgUnlinkCar(carId: number) {
    requireAuth()
    await sql`UPDATE cars SET tg_chat_id = NULL WHERE id = ${carId}`
    revalidatePath(`/cars/${carId}`); revalidatePath('/inbox')
}
// Голосовое через бота: озвучиваем Chuck Miller'ом (повторный текст берётся из кеша) и отправляем с подписью.
export async function tgVoiceToCar(carId: number, text: string) {
    requireAuth()
    const t = text.trim()
    if (!t) return { error: 'Пустое сообщение' }
    if (t.length > 1500) return { error: 'Слишком длинный текст для голосового' }
    const [car] = await sql<{ tg_chat_id: string | null }[]>`SELECT tg_chat_id::text FROM cars WHERE id = ${carId}`
    if (!car?.tg_chat_id) return { error: 'Клиент не подписан на бота' }
    try {
        const { audio } = await synthesize(t)
        await sendVoiceToClient(car.tg_chat_id, audio, t)
    } catch (e) { return { error: (e as Error).message } }
    revalidatePath('/inbox'); revalidatePath(`/inbox/${car.tg_chat_id}`)
    return { ok: true }
}

// Календарь записи. Пересечение по времени не запрещаем, но сначала показываем мастеру, с кем накладывается.
export async function saveAppt(input: {
    id?: number; car_id: number | null; client_name: string; client_phone: string; day: string; start_time: string
    duration_min: number; work: string; force?: boolean
}) {
    requireAuth()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day) || !/^\d{2}:\d{2}$/.test(input.start_time)) return { error: 'Укажите день и время' }
    if (!input.car_id && !input.client_name.trim() && !input.client_phone.trim()) return { error: 'Выберите машину или впишите клиента' }
    const duration = Math.min(Math.max(Math.round(input.duration_min) || 60, 15), 720)
    if (!input.force) {
        const busy = await conflicts(input.day, input.start_time, duration, input.id)
        if (busy.length) return { conflicts: busy.map((a) => `${a.start_time}–${endTime(a.start_time, a.duration_min)} ${[apptCar(a), a.plate].filter(Boolean).join(' ') || apptWho(a)}`) }
    }
    const v = {
        car_id: input.car_id, client_name: input.car_id ? '' : input.client_name.trim(), client_phone: input.car_id ? '' : formatPhone(input.client_phone),
        day: input.day, start_time: input.start_time, duration_min: duration, work: input.work.trim(),
    }
    let id = input.id
    // перенесли день или время — прошлое «подтвердил/перенести» от клиента больше не актуально
    if (id) await sql`UPDATE appointments SET ${sql(v)}, client_confirm = CASE WHEN day = ${v.day} AND start_time = ${v.start_time} THEN client_confirm ELSE '' END WHERE id = ${id}`
    else [{ id }] = await sql<{ id: number }[]>`INSERT INTO appointments ${sql(v)} RETURNING id`
    revalidatePath('/calendar'); revalidatePath('/'); if (input.car_id) revalidatePath(`/cars/${input.car_id}`)
    return { ok: true, id, day: input.day }
}
export async function setApptStatus(id: number, status: 'planned' | 'cancelled') {
    requireAuth()
    await sql`UPDATE appointments SET status = ${status} WHERE id = ${id}`
    revalidatePath('/calendar'); revalidatePath('/')
}
export async function deleteAppt(f: FormData) {
    requireAuth()
    const id = int(f, 'id')
    const [a] = id ? await sql<{ day: string }[]>`DELETE FROM appointments WHERE id = ${id} RETURNING day::text AS day` : []
    revalidatePath('/calendar'); revalidatePath('/')
    redirect(`/calendar${a ? `?d=${a.day}` : ''}`)
}
// Заявка клиента с /zapis: подтвердить (если клиент в боте — сразу пишем ему «Ждём вас…») или отклонить
export async function confirmAppt(id: number) {
    requireAuth()
    await sql`UPDATE appointments SET status = 'planned' WHERE id = ${id} AND status = 'pending'`
    const [a] = await sql<{ tg: string | null; brand: string; model: string; owner_name: string; client_name: string; day: string; t: string; work: string }[]>`
        SELECT c.tg_chat_id::text AS tg, coalesce(c.brand, '') AS brand, coalesce(c.model, '') AS model, coalesce(c.owner_name, '') AS owner_name,
               a.client_name, a.day::text AS day, to_char(a.start_time, 'HH24:MI') AS t, a.work
        FROM appointments a LEFT JOIN cars c ON c.id = a.car_id WHERE a.id = ${id}`
    if (a?.tg) await sendToClient(a.tg, apptText({ brand: a.brand, model: a.model, owner_name: a.owner_name || a.client_name }, a.day, a.t, a.work)).catch(() => {})
    revalidatePath('/calendar'); revalidatePath('/')
}
// Отключить мастера от бота (во вкладке «Ящик»)
export async function tgRemoveMaster(chatId: string) {
    requireAuth()
    if (/^-?\d+$/.test(chatId)) await removeMaster(chatId)
    revalidatePath('/inbox')
}

// Страница владельца: секретная ссылка одна на машину (повторный вызов — та же). У визитов без ссылки на отчёт она появится сама.
export async function ensureOwnerToken(carId: number) {
    requireAuth()
    const [c] = await sql<{ owner_token: string | null }[]>`SELECT owner_token FROM cars WHERE id = ${carId}`
    if (!c) throw new Error('no car')
    if (c.owner_token) return c.owner_token
    const token = crypto.randomBytes(12).toString('base64url')
    await sql`UPDATE cars SET owner_token = ${token} WHERE id = ${carId}`
    return token
}
export async function setWishDone(id: number, done: boolean) {
    requireAuth()
    const [w] = await sql<{ car_id: number }[]>`UPDATE car_wishes SET done = ${done} WHERE id = ${id} RETURNING car_id`
    if (w) revalidatePath(`/cars/${w.car_id}`)
}

// «Что заказать к ТО»: отметка «детали заказаны» у записи
export async function setPartsOrdered(apptId: number, ordered: boolean) {
    requireAuth()
    await sql`UPDATE appointments SET parts_ordered = ${ordered} WHERE id = ${apptId}`
    revalidatePath('/order'); revalidatePath('/calendar')
}

// ── Склад (масло и фильтры) ────────────────────────────────────────────────────────────────
const qtyNum = (v: unknown) => { const n = Number(String(v ?? '').replace(',', '.').replace(/\s/g, '')); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0 }
const cleanKind = (k: string): StockKind => (k === 'filter' ? 'filter' : 'oil')
const cleanSpec = (kind: StockKind, spec: string) => {
    const s = spec.trim()
    if (kind === 'oil') { const u = s.toUpperCase().replace(/\s/g, '').replace(/^(\d+)W(\d+)$/, '$1W-$2'); return OIL_SPECS.includes(u) || /^\d+W-\d+$/.test(u) ? u : s }
    return FILTER_TYPES.find((t) => t.startsWith(s.toLowerCase().slice(0, 4))) ?? s.toLowerCase()
}
export type NewStockItem = { kind: string; name: string; spec: string; article: string; qty: number; min_qty?: number }
// Добавить позиции (форма или голос). Если такая уже есть (вид + название + вязкость/тип) — это пересчёт: ставим новый остаток.
export async function saveStockItems(list: NewStockItem[]) {
    requireAuth()
    for (const raw of list.slice(0, 60)) {
        const kind = cleanKind(raw.kind)
        const it = { kind, name: String(raw.name ?? '').trim().slice(0, 120), spec: cleanSpec(kind, String(raw.spec ?? '')).slice(0, 40), article: String(raw.article ?? '').trim().slice(0, 60) }
        if (!it.name && !it.spec && !it.article) continue
        const qty = Math.max(0, qtyNum(raw.qty)), min = Math.max(0, qtyNum(raw.min_qty))
        const [ex] = await sql<{ id: number; qty: number }[]>`SELECT id, qty::float8 AS qty FROM stock_items
            WHERE kind = ${kind} AND lower(name) = lower(${it.name}) AND lower(spec) = lower(${it.spec}) LIMIT 1`
        if (ex) {
            if (qty !== ex.qty) await sql`INSERT INTO stock_moves (item_id, delta, reason) VALUES (${ex.id}, ${qty - ex.qty}, 'count')`
            await sql`UPDATE stock_items SET qty = ${qty}, article = CASE WHEN ${it.article} <> '' THEN ${it.article} ELSE article END WHERE id = ${ex.id}`
        } else {
            const [{ id }] = await sql<{ id: number }[]>`INSERT INTO stock_items ${sql({ ...it, qty, min_qty: min || (kind === 'oil' ? 5 : 2) })} RETURNING id`
            if (qty) await sql`INSERT INTO stock_moves (item_id, delta, reason) VALUES (${id}, ${qty}, 'start')`
        }
    }
    revalidatePath('/stock'); revalidatePath('/order')
}
// «Пришло»: + к остатку. «Пересчитал»: ставим точное число (разница пишется в историю).
export async function stockMove(itemId: number, mode: 'in' | 'count', value: number) {
    requireAuth()
    const v = qtyNum(value)
    const [it] = await sql<{ qty: number }[]>`SELECT qty::float8 AS qty FROM stock_items WHERE id = ${itemId}`
    if (!it) return
    const delta = mode === 'in' ? v : v - it.qty
    if (!delta || (mode === 'in' && v <= 0) || (mode === 'count' && v < 0)) return
    await sql.begin(async (tx) => {
        await tx`INSERT INTO stock_moves (item_id, delta, reason) VALUES (${itemId}, ${delta}, ${mode})`
        await tx`UPDATE stock_items SET qty = qty + ${delta} WHERE id = ${itemId}`
    })
    revalidatePath('/stock'); revalidatePath('/order')
}
export async function updateStockItem(itemId: number, patch: { name: string; spec: string; article: string; min_qty: number; kind: string }) {
    requireAuth()
    const kind = cleanKind(patch.kind)
    await sql`UPDATE stock_items SET ${sql({ name: patch.name.trim().slice(0, 120), spec: cleanSpec(kind, patch.spec).slice(0, 40), article: patch.article.trim().slice(0, 60), min_qty: Math.max(0, qtyNum(patch.min_qty)) })} WHERE id = ${itemId}`
    revalidatePath('/stock')
}
export async function deleteStockItem(itemId: number) {
    requireAuth()
    await sql`DELETE FROM stock_items WHERE id = ${itemId}`
    revalidatePath('/stock'); revalidatePath('/order')
}
// Надиктованные остатки → список позиций (мастер проверяет и сохраняет)
export async function parseStockVoice(text: string): Promise<StockParsed[] | null> {
    requireAuth()
    if (!process.env.ANTHROPIC_API_KEY || !text.trim()) return null
    try { return await parseStockText(text.slice(0, 4000)) } catch (e) { console.error('parseStockVoice', e); return null }
}

// ── Автонапоминания ботом ─────────────────────────────────────────────────────────────────
export async function toggleReminder(kind: 'appt' | 'due', on: boolean) {
    requireAuth()
    await setReminderSetting(kind, on)
    revalidatePath('/reminders')
}
// «Отправить сейчас» — не ждать cron (часы не проверяем, включатели — да)
export async function sendRemindersNow() {
    requireAuth()
    const r = await runReminders({ ignoreHours: true })
    revalidatePath('/reminders'); revalidatePath('/inbox')
    return r
}
// Пример в Telegram мастерам — посмотреть, как это увидит клиент (кнопки в примере ничего не меняют)
export async function sendReminderSample() {
    requireAuth()
    const masters = await getMasters()
    if (!masters.length) return 'Сначала подключите себя к боту в «Ящике»'
    const tomorrow = new Date(Date.now() + 86400_000 + 3 * 3600_000).toISOString().slice(0, 10)
    for (const m of masters) {
        await tgSend(m.chat_id, '👀 Так выглядят автонапоминания у клиента:')
        await tgSend(m.chat_id, apptReminderText('Ильдар', 'Audi Q7', tomorrow, '10:00', 'ТО'), { reply_markup: { inline_keyboard: apptButtons(0) } })
        await tgSend(m.chat_id, dueReminderText('Ильдар', 'Audi Q7', 'до 30 октября'), { reply_markup: { inline_keyboard: dueButtons } })
    }
    return null
}
