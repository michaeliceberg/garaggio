'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { getCarByOwnerToken } from '@/lib/data'
import { notifyMasters, tgEnabled } from '@/lib/tg'

// Пожелание владельца к следующему ТО — открыто без входа, только по секретной ссылке машины.
export async function addWish(token: string, text: string, website?: string) {
    if (website) return { ok: true } // ловушка для ботов
    const t = text.trim().slice(0, 500)
    if (!t) return { error: 'Напишите, что хотите сделать' }
    const car = await getCarByOwnerToken(token)
    if (!car) return { error: 'Ссылка устарела — попросите у Маэстро новую' }
    const [{ n }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM car_wishes WHERE car_id = ${car.id} AND created_at > now() - interval '1 day'`
    if (n >= 10) return { error: 'На сегодня хватит 🙂 Маэстро уже всё увидит' }
    await sql`INSERT INTO car_wishes (car_id, text) VALUES (${car.id}, ${t})`
    revalidatePath(`/c/${token}`); revalidatePath(`/cars/${car.id}`)
    if (tgEnabled()) {
        const who = [car.owner_name, [car.brand, car.model].filter(Boolean).join(' '), car.plate].filter(Boolean).join(' · ')
        await notifyMasters(`📝 Пожелание к следующему ТО\n${who}\n\n${t}\n\nКарточка: https://garaggio.ru/cars/${car.id}`).catch(() => {})
    }
    return { ok: true }
}
