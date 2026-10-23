import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import crypto from 'node:crypto'
import { formatPhone, km } from '@/lib/format'
import { BOOKING_URL } from '@/lib/messages'
import {
    addMaster, carFromPayload, tgApi, carsByPhone, contactKeyboard, getMasters, masterPayload, notifyMasters, sendToClient, tgSend,
} from '@/lib/tg'

// Обновления Telegram: их сюда отдаёт опросчик scripts/tg-poller.mjs (с секретом в заголовке).
type TgUser = { id: number; first_name?: string; last_name?: string; username?: string }
type TgMessage = {
    message_id: number; from?: TgUser; chat: { id: number; type: string }; text?: string; caption?: string
    contact?: { phone_number: string; user_id?: number }; reply_to_message?: { message_id: number }
}

// кнопка «Записаться онлайн» под сообщением — открывает страницу самозаписи
const bookingButton = { inline_keyboard: [[{ text: '📅 Записаться онлайн', url: BOOKING_URL }]] }
const sendBooking = (chatId: string) => tgSend(chatId, 'Выберите удобный день и время — Маэстро подтвердит запись 🤌', { reply_markup: bookingButton })

// Постоянные кнопки клиента внизу чата (вместо клавиатуры)
const B = { book: '📅 Записаться', due: '🔧 Когда ТО?', last: '📋 Последний визит', write: '💬 Написать Маэстро', page: '🚗 Моя страница' }
const menuKeyboard = { keyboard: [[{ text: B.book }, { text: B.due }], [{ text: B.last }, { text: B.page }], [{ text: B.write }]], resize_keyboard: true, is_persistent: true }
const dateRu = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })

const carTitle = (c: { plate: string; brand: string; model: string }) => [[c.brand, c.model].filter(Boolean).join(' '), c.plate].filter(Boolean).join(' · ')

export async function POST(req: Request) {
    if (!process.env.TG_WEBHOOK_SECRET || req.headers.get('x-telegram-bot-api-secret-token') !== process.env.TG_WEBHOOK_SECRET) {
        return new Response('forbidden', { status: 403 })
    }
    const update = await req.json().catch(() => null) as { message?: TgMessage; callback_query?: TgCallback } | null
    if (update?.callback_query) { await handleCallback(update.callback_query).catch((e) => console.error('tg callback', e)); return Response.json({ ok: true }) }
    const m = update?.message
    // Отвечаем Telegram 200 даже при ошибке — иначе он будет слать то же сообщение снова и снова.
    if (m && m.chat.type === 'private') await handle(m).catch((e) => console.error('tg webhook', e))
    return Response.json({ ok: true })
}

// Кнопки под автонапоминанием о записи: ap:yes:<id> — «Приеду», ap:move:<id> — «Перенести»
type TgCallback = { id: string; from: TgUser; data?: string; message?: { message_id: number; chat: { id: number }; text?: string } }
async function handleCallback(q: TgCallback) {
    const chatId = String(q.message?.chat.id ?? q.from.id)
    const answer = (text?: string) => tgApi('answerCallbackQuery', { callback_query_id: q.id, ...(text ? { text } : {}) }).catch(() => {})
    const mm = /^ap:(yes|move):(\d+)$/.exec(q.data ?? '')
    if (!mm) return answer()
    const [, what, idStr] = mm
    if (idStr === '0') { await answer('Это пример — клиенту придёт такое же 🤌'); return }
    const [a] = await sql<{ id: number; day: string; time: string; plate: string; brand: string; model: string; owner_name: string }[]>`
        SELECT a.id, a.day::text AS day, to_char(a.start_time, 'HH24:MI') AS time, c.plate, c.brand, c.model, c.owner_name
        FROM appointments a JOIN cars c ON c.id = a.car_id WHERE a.id = ${Number(idStr)} AND c.tg_chat_id = ${chatId} AND a.status = 'planned'`
    if (!a) { await answer('Эта запись уже неактуальна'); return }
    await sql`UPDATE appointments SET client_confirm = ${what} WHERE id = ${a.id}`
    // убираем кнопки у напоминания, чтобы не нажимали ещё раз
    if (q.message) await tgApi('editMessageReplyMarkup', { chat_id: chatId, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {})
    const when = `${new Date(a.day + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC', day: 'numeric', month: 'long' })} в ${a.time}`
    const who = [carTitle(a), a.owner_name].filter(Boolean).join(' · ')
    if (what === 'yes') {
        await answer('Грацие! Ждём 🤌')
        await sendToClient(chatId, `Отлично, ждём вас ${when}! 🤌`)
        await notifyMasters(`✅ Клиент подтвердил запись: ${who} — ${when}`)
    } else {
        await answer()
        await sendToClient(chatId, 'Без проблем! Напишите сюда, когда вам удобно, — Маэстро подберёт время 🤌', { reply_markup: menuKeyboard })
        await notifyMasters(`🔁 Клиент просит перенести запись: ${who} — ${when}. Ответьте ему (Reply), когда договоритесь — поменяйте в календаре.`, { clientChat: chatId })
    }
    revalidatePath('/calendar'); revalidatePath('/inbox')
}

async function handle(m: TgMessage) {
    const chatId = String(m.chat.id)
    const masters = await getMasters()
    const isMaster = masters.some((x) => x.chat_id === chatId)
    const text = (m.text ?? m.caption ?? '').trim()

    // Подключение мастера: /start m_<подпись> со страницы «Ящик»
    if (text === `/start ${masterPayload()}`) {
        const who = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ')
        await addMaster(chatId, who)
        await tgSend(chatId, 'Бонджорно, Маэстро! 🤌 Сюда будут приходить сообщения клиентов и заявки на запись. Чтобы ответить — просто ответьте (Reply) на сообщение клиента.')
        await notifyMasters(`👋 ${who || 'Ещё один Маэстро'} подключился к боту — теперь сообщения клиентов приходят и ему.`, { except: chatId })
        return
    }

    // Мастер в своём чате: ответ на пересланное сообщение уходит клиенту
    if (isMaster) {
        // имя мастера (у перенесённого со старой версии его не было) — берём из Telegram
        if (!masters.find((x) => x.chat_id === chatId)?.name && m.from?.first_name) await addMaster(chatId, [m.from.first_name, m.from.last_name].filter(Boolean).join(' '))
        const replyTo = m.reply_to_message?.message_id
        const [orig] = replyTo ? await sql<{ chat_id: string }[]>`
            SELECT client_chat::text AS chat_id FROM tg_relay WHERE master_chat = ${chatId} AND master_msg_id = ${replyTo}
            UNION ALL SELECT chat_id::text FROM tg_messages WHERE master_msg_id = ${replyTo} LIMIT 1` : []
        if (!orig) {
            // команды работают и у мастера; остальное — подсказка, как тут всё устроено
            if (text === '/zapis' || text === '/start zapis' || /^(записаться|запись)$/i.test(text)) {
                await tgSend(chatId, `Ссылка для самозаписи клиентов — её можно пересылать: ${BOOKING_URL}\nЗаявки придут сюда, подтвердить — в календаре приложения.`, { reply_markup: bookingButton })
                return
            }
            await tgSend(chatId, `Вы подключены как Маэстро 🤌 Сюда приходят сообщения клиентов и заявки на запись.\n\n• Ответить клиенту — нажмите «Ответить» (Reply) на его сообщение\n• /zapis — ссылка для самозаписи клиентов\n• Всё остальное — в приложении: https://garaggio.ru`)
            return
        }
        if (!text) { await tgSend(chatId, 'Пока пересылаю клиентам только текст.'); return }
        try {
            await sendToClient(orig.chat_id, text)
            revalidatePath('/inbox')
            // остальные мастера видят, что клиенту уже ответили
            const [c] = await sql<{ name: string }[]>`SELECT name FROM tg_chats WHERE chat_id = ${orig.chat_id}`
            const me = masters.find((x) => x.chat_id === chatId)?.name || 'Маэстро'
            await notifyMasters(`↪️ ${me} ответил${c?.name ? ` (${c.name})` : ''}:\n${text}`, { except: chatId })
        } catch (e) { await tgSend(chatId, `Не отправилось: ${(e as Error).message}`) }
        return
    }

    // Клиент: запоминаем, кто это
    const u = m.from
    const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ')
    await sql`INSERT INTO tg_chats (chat_id, name, username) VALUES (${chatId}, ${name}, ${u?.username ?? ''})
              ON CONFLICT (chat_id) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username`

    if (text === '/zapis' || text === '/start zapis' || /^(записаться|запись)$/i.test(text)) {
        await sendBooking(chatId)
        return
    }

    if (text.startsWith('/start')) {
        const carId = carFromPayload(text.slice(6).trim())
        if (carId) {
            const [car] = await sql<{ plate: string; brand: string; model: string; owner_name: string }[]>`
                UPDATE cars SET tg_chat_id = ${chatId} WHERE id = ${carId} RETURNING plate, brand, model, owner_name`
            if (car) {
                const hi = car.owner_name ? `Чао, ${car.owner_name.split(' ')[0]}!` : 'Чао!'
                await tgSend(chatId, `${hi} Это Garaggio 🤌 Вы подписаны: ${carTitle(car)}.\n\nСюда придут напоминания о ТО и отчёты после визитов. Кнопки внизу — записаться, узнать про ТО, последний визит, своя страница с историей или написать Маэстро.`, { reply_markup: menuKeyboard })
                await notifyMasters(`✅ Клиент подписался на бота: ${carTitle(car)}${name ? ` (${name})` : ''}`)
                revalidatePath(`/cars/${carId}`); revalidatePath('/inbox')
                return
            }
        }
        const [linked] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM cars WHERE tg_chat_id = ${chatId}`
        if (linked.n) { await tgSend(chatId, 'Чао! Это Garaggio 🤌 Кнопки внизу — записаться, узнать про ТО, последний визит, своя страница с историей или написать Маэстро.', { reply_markup: menuKeyboard }); return }
        await tgSend(chatId, 'Чао! Это Garaggio 🤌 Поделитесь номером телефона — найдём вашу машину, и сюда будут приходить напоминания о ТО и отчёты.', { reply_markup: contactKeyboard })
        return
    }

    if (text === B.book) { await sendBooking(chatId); return }
    if (text === B.write || text === '💬 Написать мастеру') { await tgSend(chatId, 'Напишите сюда, что случилось или что хотите спросить, — Маэстро ответит в этом чате 🤌', { reply_markup: menuKeyboard }); return }
    // «Моя страница»: секретная ссылка на страницу владельца (вся история ТО + пожелания к следующему ТО), кнопкой на каждую машину
    if (text === B.page) {
        const cars = await sql<{ id: number; plate: string; brand: string; model: string; owner_token: string | null }[]>`SELECT id, plate, brand, model, owner_token FROM cars WHERE tg_chat_id = ${chatId} ORDER BY id`
        if (!cars.length) { await tgSend(chatId, 'Пока не нашли вашу машину. Поделитесь номером телефона — и всё заработает.', { reply_markup: contactKeyboard }); return }
        const rows = []
        for (const c of cars) {
            let token = c.owner_token
            if (!token) {
                token = crypto.randomBytes(12).toString('base64url')
                const [u] = await sql<{ owner_token: string }[]>`UPDATE cars SET owner_token = coalesce(owner_token, ${token}) WHERE id = ${c.id} RETURNING owner_token`
                token = u.owner_token
            }
            rows.push([{ text: `🚗 ${carTitle(c)}`, url: `https://garaggio.ru/c/${token}` }])
        }
        await tgSend(chatId, 'Ваша страница в Garaggio 🤌 Там вся история обслуживания с отчётами и фото. Туда же можно написать, что сделать на следующем ТО.\n\nСсылка личная — не пересылайте её чужим.', { reply_markup: { inline_keyboard: rows } })
        return
    }
    if (text === B.due || text === B.last) {
        const cars = await sql<{ id: number; plate: string; brand: string; model: string }[]>`SELECT id, plate, brand, model FROM cars WHERE tg_chat_id = ${chatId} ORDER BY id`
        if (!cars.length) { await tgSend(chatId, 'Пока не нашли вашу машину. Поделитесь номером телефона — и всё заработает.', { reply_markup: contactKeyboard }); return }
        const parts: string[] = []
        for (const c of cars) {
            const [v] = await sql<{ id: number; visit_date: string; mileage: number | null; works: string; next_date: string | null; next_mileage: number | null; share_token: string | null }[]>`
                SELECT id, visit_date::text, mileage, works, next_date::text, next_mileage, share_token FROM visits WHERE car_id = ${c.id} ORDER BY visit_date DESC, id DESC LIMIT 1`
            if (!v) { parts.push(`🚗 ${carTitle(c)}: визитов ещё не было`); continue }
            if (text === B.due) {
                const when = [v.next_date && dateRu(v.next_date), v.next_mileage && `или на ${km(v.next_mileage)}`].filter(Boolean).join(' ')
                parts.push(`🚗 ${carTitle(c)}\nСледующее ТО: ${when || 'Маэстро ещё не назначил'}\nПоследний визит: ${dateRu(v.visit_date)}${v.mileage ? `, ${km(v.mileage)}` : ''}`)
            } else {
                let token = v.share_token
                if (!token) { token = crypto.randomBytes(12).toString('base64url'); await sql`UPDATE visits SET share_token = ${token} WHERE id = ${v.id}` }
                const works = v.works.split('\n').filter(Boolean).slice(0, 4).map((w) => `• ${w}`).join('\n')
                parts.push(`🚗 ${carTitle(c)} — ${dateRu(v.visit_date)}${works ? `\n${works}` : ''}\nОтчёт с фото: https://garaggio.ru/r/${token}`)
            }
        }
        await tgSend(chatId, parts.join('\n\n'), { reply_markup: menuKeyboard })
        return
    }

    if (text === '/stop') {
        await sql`UPDATE cars SET tg_chat_id = NULL WHERE tg_chat_id = ${chatId}`
        await tgSend(chatId, 'Готово, напоминания больше не придут. Если передумаете — нажмите /start.')
        revalidatePath('/inbox')
        return
    }

    if (m.contact) {
        if (m.contact.user_id && m.contact.user_id !== u?.id) { await tgSend(chatId, 'Нужен ваш собственный номер — нажмите кнопку «Поделиться номером».', { reply_markup: contactKeyboard }); return }
        const phone = formatPhone(m.contact.phone_number)
        await sql`UPDATE tg_chats SET phone = ${phone} WHERE chat_id = ${chatId}`
        const cars = await carsByPhone(phone)
        if (cars.length) {
            const linked = await sql<{ plate: string; brand: string; model: string }[]>`
                UPDATE cars SET tg_chat_id = ${chatId} WHERE id IN ${sql(cars.map((c) => c.id))} RETURNING plate, brand, model`
            await tgSend(chatId, `Грацие! Нашли: ${linked.map(carTitle).join(', ')} 🚗\n\nСюда придут напоминания о ТО и отчёты. Кнопки внизу — записаться, узнать про ТО, последний визит, своя страница с историей или написать Маэстро.`, { reply_markup: menuKeyboard })
            await notifyMasters(`✅ Клиент подписался по номеру ${phone}: ${linked.map(carTitle).join(', ')}`)
        } else {
            await tgSend(chatId, 'Грацие! Пока не нашли машину с этим номером — Маэстро добавит её, и всё заработает. Можете написать сюда, что за машина.', { reply_markup: menuKeyboard })
            await notifyMasters(`❓ Новый клиент в боте, машина не найдена: ${phone}${name ? ` (${name})` : ''}`)
        }
        revalidatePath('/inbox')
        return
    }

    // Обычное сообщение клиента → в «Ящик» и копией мастеру в Telegram
    const body = text || '[фото, голосовое или файл — откройте Telegram]'
    const [cars] = await sql<{ list: string }[]>`
        SELECT coalesce(string_agg(trim(brand || ' ' || model || ' ' || plate), ', '), '') AS list FROM cars WHERE tg_chat_id = ${chatId}`
    const who = [name, cars.list].filter(Boolean).join(' · ') || 'Клиент'
    await sql`INSERT INTO tg_messages (chat_id, out, text) VALUES (${chatId}, false, ${body})`
    await notifyMasters(`💬 ${who}:\n${body}`, { clientChat: chatId })
    revalidatePath('/inbox')
}
