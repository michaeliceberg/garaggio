import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db'
import { formatPhone } from '@/lib/format'
import {
    carFromPayload, carsByPhone, contactKeyboard, getMasterChat, masterPayload, noKeyboard, sendToClient, setMasterChat, tgSend,
} from '@/lib/tg'

// Вебхук Telegram: https://garaggio.ru/api/tg (ставится скриптом scripts/tg-webhook.mjs с секретом в заголовке).
type TgUser = { id: number; first_name?: string; last_name?: string; username?: string }
type TgMessage = {
    message_id: number; from?: TgUser; chat: { id: number; type: string }; text?: string; caption?: string
    contact?: { phone_number: string; user_id?: number }; reply_to_message?: { message_id: number }
}

const carTitle = (c: { plate: string; brand: string; model: string }) => [[c.brand, c.model].filter(Boolean).join(' '), c.plate].filter(Boolean).join(' · ')

export async function POST(req: Request) {
    if (!process.env.TG_WEBHOOK_SECRET || req.headers.get('x-telegram-bot-api-secret-token') !== process.env.TG_WEBHOOK_SECRET) {
        return new Response('forbidden', { status: 403 })
    }
    const update = await req.json().catch(() => null) as { message?: TgMessage } | null
    const m = update?.message
    // Отвечаем Telegram 200 даже при ошибке — иначе он будет слать то же сообщение снова и снова.
    if (m && m.chat.type === 'private') await handle(m).catch((e) => console.error('tg webhook', e))
    return Response.json({ ok: true })
}

async function handle(m: TgMessage) {
    const chatId = String(m.chat.id)
    const master = await getMasterChat()
    const text = (m.text ?? m.caption ?? '').trim()

    // Подключение мастера: /start m_<подпись> со страницы «Ящик»
    if (text === `/start ${masterPayload()}`) {
        await setMasterChat(chatId)
        await tgSend(chatId, 'Бонджорно, маэстро! 🤌 Сюда будут приходить сообщения клиентов. Чтобы ответить — просто ответьте (Reply) на сообщение клиента.')
        return
    }

    // Мастер в своём чате: ответ на пересланное сообщение уходит клиенту
    if (master === chatId) {
        const replyTo = m.reply_to_message?.message_id
        const [orig] = replyTo ? await sql<{ chat_id: string }[]>`SELECT chat_id::text FROM tg_messages WHERE master_msg_id = ${replyTo} LIMIT 1` : []
        if (!orig) { await tgSend(chatId, 'Чтобы ответить клиенту, нажмите «Ответить» (Reply) на его сообщение.'); return }
        if (!text) { await tgSend(chatId, 'Пока пересылаю клиентам только текст.'); return }
        try {
            await sendToClient(orig.chat_id, text)
            revalidatePath('/inbox')
        } catch (e) { await tgSend(chatId, `Не отправилось: ${(e as Error).message}`) }
        return
    }

    // Клиент: запоминаем, кто это
    const u = m.from
    const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ')
    await sql`INSERT INTO tg_chats (chat_id, name, username) VALUES (${chatId}, ${name}, ${u?.username ?? ''})
              ON CONFLICT (chat_id) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username`

    if (text.startsWith('/start')) {
        const carId = carFromPayload(text.slice(6).trim())
        if (carId) {
            const [car] = await sql<{ plate: string; brand: string; model: string; owner_name: string }[]>`
                UPDATE cars SET tg_chat_id = ${chatId} WHERE id = ${carId} RETURNING plate, brand, model, owner_name`
            if (car) {
                const hi = car.owner_name ? `Чао, ${car.owner_name.split(' ')[0]}!` : 'Чао!'
                await tgSend(chatId, `${hi} Это Garaggio 🤌 Вы подписаны: ${carTitle(car)}.\n\nСюда придут напоминания о ТО и отчёты после визитов. А ещё можно написать мастеру прямо здесь.`, { reply_markup: noKeyboard })
                await notifyMaster(master, `✅ Клиент подписался на бота: ${carTitle(car)}${name ? ` (${name})` : ''}`)
                revalidatePath(`/cars/${carId}`); revalidatePath('/inbox')
                return
            }
        }
        await tgSend(chatId, 'Чао! Это Garaggio 🤌 Поделитесь номером телефона — найдём вашу машину, и сюда будут приходить напоминания о ТО и отчёты.', { reply_markup: contactKeyboard })
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
            await tgSend(chatId, `Грацие! Нашли: ${linked.map(carTitle).join(', ')} 🚗\n\nСюда придут напоминания о ТО и отчёты. Можно написать мастеру прямо здесь.`, { reply_markup: noKeyboard })
            await notifyMaster(master, `✅ Клиент подписался по номеру ${phone}: ${linked.map(carTitle).join(', ')}`)
        } else {
            await tgSend(chatId, 'Грацие! Пока не нашли машину с этим номером — мастер добавит её, и всё заработает. Можете написать сюда, что за машина.', { reply_markup: noKeyboard })
            await notifyMaster(master, `❓ Новый клиент в боте, машина не найдена: ${phone}${name ? ` (${name})` : ''}`)
        }
        revalidatePath('/inbox')
        return
    }

    // Обычное сообщение клиента → в «Ящик» и копией мастеру в Telegram
    const body = text || '[фото, голосовое или файл — откройте Telegram]'
    const [cars] = await sql<{ list: string }[]>`
        SELECT coalesce(string_agg(trim(brand || ' ' || model || ' ' || plate), ', '), '') AS list FROM cars WHERE tg_chat_id = ${chatId}`
    const who = [name, cars.list].filter(Boolean).join(' · ') || 'Клиент'
    let masterMsgId: number | null = null
    if (master) {
        try { masterMsgId = (await tgSend(master, `💬 ${who}:\n${body}`)).message_id } catch (e) { console.error('tg master', e) }
    }
    await sql`INSERT INTO tg_messages (chat_id, out, text, master_msg_id) VALUES (${chatId}, false, ${body}, ${masterMsgId})`
    revalidatePath('/inbox')
}

async function notifyMaster(master: string | null, text: string) {
    if (master) await tgSend(master, text).catch((e) => console.error('tg master', e))
}
