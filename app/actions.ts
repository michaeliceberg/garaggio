'use server'

import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { endSession, requireAuth } from '@/lib/auth'
import { parseVoiceText, type VoiceParsed } from '@/lib/ai'
import { guessPowertrain, normPlate, normVin, type Part } from '@/lib/format'

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
        powertrain: ['ice', 'hybrid', 'ev'].includes(str(f, 'powertrain')) ? str(f, 'powertrain') : guessPowertrain(str(f, 'brand'), str(f, 'model')), owner_name: str(f, 'owner_name'), owner_phone: str(f, 'owner_phone'), notes: str(f, 'notes'),
    }
    let carId = id
    if (id) await sql`UPDATE cars SET ${sql(v)} WHERE id = ${id}`
    else [{ id: carId }] = await sql<{ id: number }[]>`INSERT INTO cars ${sql(v)} RETURNING id`
    revalidatePath('/')
    redirect(`/cars/${carId}`)
}
export async function deleteCar(f: FormData) {
    requireAuth()
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
    notes: string; recommendations: string; declined: boolean; next_date: string | null; next_mileage: number | null
}) {
    requireAuth()
    const parts = input.parts.filter((p) => p.name.trim()).map((p) => ({ name: p.name.trim(), article: (p.article ?? '').trim(), price: Math.round(Number(p.price) || 0) }))
    const v = {
        car_id: input.car_id, visit_date: input.visit_date, mileage: input.mileage, works: input.works.trim(), parts: sql.json(parts),
        labor_cost: Math.round(input.labor_cost || 0), notes: input.notes.trim(), recommendations: input.recommendations.trim(),
        declined: input.declined, next_date: input.next_date || null, next_mileage: input.next_mileage,
    }
    if (input.id) { await sql`UPDATE visits SET ${sql(v)} WHERE id = ${input.id}`; revalidatePath(`/cars/${input.car_id}`); return input.id }
    const [{ id }] = await sql<{ id: number }[]>`INSERT INTO visits ${sql(v)} RETURNING id`
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
export async function deleteVisit(f: FormData) {
    requireAuth()
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
