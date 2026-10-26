'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { formatPhone, normPlate } from '@/lib/format'
import { freeSlots, todayMsk, SELF_WORKS, SELF_DAYS_AHEAD } from '@/lib/appts'
import { carsByPhone, notifyMasters, tgEnabled } from '@/lib/tg'
import { phoneDigits } from '@/lib/messages'
import { recordConsent } from '@/lib/consent'

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

export async function book(input: { day: string; time: string; workId: string; comment: string; name: string; phone: string; car: string; plate?: string; website?: string; consent?: boolean }) {
    if (input.website) return { ok: true } // ловушка для ботов: скрытое поле заполняют только программы
    const name = input.name.trim().slice(0, 60), car = input.car.trim().slice(0, 60), comment = input.comment.trim().slice(0, 300)
    const plate = normPlate(input.plate ?? '').slice(0, 12)
    const digits = phoneDigits(input.phone)
    if (!input.consent) return { error: 'Отметьте согласие на обработку персональных данных' }
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
    if (mine >= 3 || recent >= 30) return { error: 'Уже есть заявки с этого номера — Маэстро скоро свяжется' }

    const phone = formatPhone(digits)
    // клиент уже есть в базе — привяжем к его машине: по номеру машины, иначе по телефону
    const [byPlate] = plate.length >= 6 ? await sql<{ id: number }[]>`SELECT id FROM cars WHERE plate_norm = ${plate} LIMIT 1` : []
    const car_id = byPlate?.id ?? (await carsByPhone(phone)).map((c) => c.id)[0]
    const workText = [work.text, comment].filter(Boolean).join('\n')
    const [a] = await sql<{ id: number }[]>`
        INSERT INTO appointments (car_id, client_name, client_phone, client_car, client_plate, day, start_time, duration_min, work, status, source)
        VALUES (${car_id ?? null}, ${name}, ${phone}, ${car}, ${plate}, ${input.day}, ${input.time}, ${work.minutes}, ${workText}, 'pending', 'client')
        RETURNING id`
    await recordConsent({ source: 'booking', phone, name, appointmentId: a.id })
    revalidatePath('/calendar'); revalidatePath('/')

    if (tgEnabled()) {
        const d = new Date(input.day + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'long' })
        await notifyMasters(`📅 Новая заявка на запись\n${name}, ${phone}${car || plate ? `\n🚗 ${[car, plate].filter(Boolean).join(' · ')}` : ''}\n🕐 ${d}, ${input.time}\n🔧 ${workText.replace(/\n/g, ' · ') || 'не указано'}\n\nПодтвердить: https://garaggio.ru/calendar?d=${input.day}`)
    }
    return { ok: true, id: a.id }
}

// Сколько свободных начал в каждый из дней (полоска дней: закрытые — серые, выбираем первый свободный)
export async function getAvailability(days: string[], workId: string) {
    const ok = days.filter(validDay).slice(0, SELF_DAYS_AHEAD + 1)
    const minutes = workOf(workId).minutes
    const counts = await Promise.all(ok.map((d) => freeSlots(d, minutes).then((s) => s.length)))
    return Object.fromEntries(ok.map((d, i) => [d, counts[i]])) as Record<string, number>
}
