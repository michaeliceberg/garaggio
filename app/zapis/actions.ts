'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { formatPhone } from '@/lib/format'
import { freeSlots, todayMsk, SELF_WORKS, SELF_DAYS_AHEAD } from '@/lib/appts'
import { carsByPhone, getMasterChat, tgEnabled, tgSend } from '@/lib/tg'
import { phoneDigits } from '@/lib/messages'

// Самозапись клиентов — открыто без входа. Клиент видит только свободное время, чужих записей не видит.
const validDay = (day: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
    const today = todayMsk()
    const last = new Date(today + 'T12:00:00Z'); last.setUTCDate(last.getUTCDate() + SELF_DAYS_AHEAD)
    return day >= today && day <= last.toISOString().slice(0, 10)
}
const workOf = (id: string) => SELF_WORKS.find((w) => w.id === id) ?? SELF_WORKS[SELF_WORKS.length - 1]

export async function getSlots(day: string, workId: string) {
    if (!validDay(day)) return []
    return freeSlots(day, workOf(workId).minutes)
}

export async function book(input: { day: string; time: string; workId: string; comment: string; name: string; phone: string; car: string; website?: string }) {
    if (input.website) return { ok: true } // ловушка для ботов: скрытое поле заполняют только программы
    const name = input.name.trim().slice(0, 60), car = input.car.trim().slice(0, 60), comment = input.comment.trim().slice(0, 300)
    const digits = phoneDigits(input.phone)
    if (!name) return { error: 'Напишите, как вас зовут' }
    if (digits.length < 11) return { error: 'Проверьте номер телефона' }
    if (!validDay(input.day) || !/^\d{2}:\d{2}$/.test(input.time)) return { error: 'Выберите день и время' }
    const work = workOf(input.workId)
    if (!(await freeSlots(input.day, work.minutes)).includes(input.time)) return { error: 'Это время только что заняли — выберите другое' }
    // не больше 3 будущих заявок с одного номера и 30 за час со всех — от баловства
    const [{ n: mine }] = await sql<{ n: number }[]>`
        SELECT count(*)::int AS n FROM appointments WHERE source = 'client' AND status = 'pending' AND day >= ${todayMsk()}
          AND regexp_replace(client_phone, '[^0-9]', '', 'g') = ${digits}`
    const [{ n: recent }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM appointments WHERE source = 'client' AND created_at > now() - interval '1 hour'`
    if (mine >= 3 || recent >= 30) return { error: 'Уже есть заявки с этого номера — мастер скоро свяжется' }

    const phone = formatPhone(digits)
    const [car_id] = (await carsByPhone(phone)).map((c) => c.id) // клиент уже есть в базе — привяжем к его машине
    const workText = [work.text, comment].filter(Boolean).join('\n')
    const [a] = await sql<{ id: number }[]>`
        INSERT INTO appointments (car_id, client_name, client_phone, client_car, day, start_time, duration_min, work, status, source)
        VALUES (${car_id ?? null}, ${name}, ${phone}, ${car}, ${input.day}, ${input.time}, ${work.minutes}, ${workText}, 'pending', 'client')
        RETURNING id`
    revalidatePath('/calendar'); revalidatePath('/')

    if (tgEnabled()) {
        const master = await getMasterChat()
        const d = new Date(input.day + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'long' })
        if (master) await tgSend(master, `📅 Новая заявка на запись\n${name}, ${phone}${car ? `\n🚗 ${car}` : ''}\n🕐 ${d}, ${input.time}\n🔧 ${workText.replace(/\n/g, ' · ') || 'не указано'}\n\nПодтвердить: https://garaggio.ru/calendar?d=${input.day}`)
            .catch((e) => console.error('tg master', e))
    }
    return { ok: true, id: a.id }
}
