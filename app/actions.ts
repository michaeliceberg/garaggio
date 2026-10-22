'use server'

import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { checkPassword, endSession, requireAuth } from '@/lib/auth'
import { parseVoiceText, type VoiceParsed } from '@/lib/ai'
import { notifyMasters, removeMaster, sendToClient, sendVoiceToClient } from '@/lib/tg'
import { synthesize } from '@/lib/tts'
import { apptCar, apptWho, conflicts, endTime } from '@/lib/appts'
import { apptText } from '@/lib/messages'
import { POWERTRAINS, formatPhone, guessPowertrain, normPlate, normVin, type Part } from '@/lib/format'

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const int = (f: FormData, k: string) => { const v = str(f, k).replace(/\s/g, ''); return v === '' ? null : Math.round(Number(v)) || null }

export async function logout() { endSession(); redirect('/login') }

export async function saveCar(f: FormData) {
    requireAuth()
    const id = int(f, 'id')
    const plate = str(f, 'plate').toUpperCase()
    const v = {
        plate, plate_norm: normPlate(plate), vin: normVin(str(f, 'vin')), brand: str(f, 'brand'), model: str(f, 'model'),
        year: int(f, 'year'), color: str(f, 'color'),
        powertrain: (POWERTRAINS as string[]).includes(str(f, 'powertrain')) ? str(f, 'powertrain') : guessPowertrain(str(f, 'brand'), str(f, 'model')), owner_name: str(f, 'owner_name'), owner_phone: formatPhone(str(f, 'owner_phone')),
        owner_address: str(f, 'owner_address'), owner_job: str(f, 'owner_job'), notes: str(f, 'notes'),
        oil_spec: str(f, 'oil_spec').toUpperCase(), oil_volume: str(f, 'oil_volume').replace('.', ','), oil_method: ['drain', 'suck'].includes(str(f, 'oil_method')) ? str(f, 'oil_method') : '', oil_note: str(f, 'oil_note'),
    }
    let carId = id
    if (id) await sql`UPDATE cars SET ${sql(v)} WHERE id = ${id}`
    else [{ id: carId }] = await sql<{ id: number }[]>`INSERT INTO cars ${sql(v)} RETURNING id`
    const appt = int(f, 'appt') // машину завели из записи в календаре — привязываем запись
    if (appt) { await sql`UPDATE appointments SET car_id = ${carId}, client_name = '', client_phone = '' WHERE id = ${appt}`; revalidatePath('/calendar') }
    revalidatePath('/')
    redirect(`/cars/${carId}`)
}
// Удаление машины и визита — только с паролем мастера (защита от случайного нажатия). Возвращает текст ошибки.
const WRONG_PW = 'Неверный пароль'
export async function deleteCar(_prev: string | null, f: FormData): Promise<string | null> {
    requireAuth()
    if (!checkPassword(str(f, 'password'))) return WRONG_PW
    const id = int(f, 'id')
    if (id) {
        const files = await sql<{ file: string }[]>`SELECT p.file FROM photos p JOIN visits v ON v.id = p.visit_id WHERE v.car_id = ${id}`
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
    if (input.id) { await sql`UPDATE visits SET ${sql(v)} WHERE id = ${input.id}`; revalidatePath(`/cars/${input.car_id}`); return input.id }
    const [{ id }] = await sql<{ id: number }[]>`INSERT INTO visits ${sql(v)} RETURNING id`
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
        await sql`DELETE FROM visits WHERE id = ${id}`
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
    if (id) await sql`UPDATE appointments SET ${sql(v)} WHERE id = ${id}`
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
