import 'server-only'
import crypto from 'node:crypto'
import { sql } from './db'
import { BOOKING_URL, phoneDigits } from './messages'

// Telegram-бот Garaggio: клиенты подписываются (ссылка/QR машины или номер телефона),
// получают напоминания и отчёты, пишут мастеру; мастер отвечает из приложения или ответом в Telegram.
export const BOT = process.env.TG_BOT_USERNAME || 'garaggio_app_bot'
export const tgEnabled = () => !!process.env.TG_BOT_TOKEN

type Btn = { text: string; url?: string; request_contact?: boolean }
type Extra = { reply_markup?: unknown; disable_web_page_preview?: boolean }

export async function tgApi<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
    const r = await fetch(`${process.env.TG_API_BASE || 'https://api.telegram.org'}/bot${process.env.TG_BOT_TOKEN}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store',
    })
    const j = await r.json() as { ok: boolean; result: T; description?: string; error_code?: number }
    if (!j.ok) throw Object.assign(new Error(j.description || 'telegram error'), { code: j.error_code })
    return j.result
}
export async function tgSend(chatId: string | number, text: string, extra: Extra = {}) {
    return tgApi<{ message_id: number }>('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true, ...extra })
}
export const contactKeyboard = { keyboard: [[{ text: '📱 Поделиться номером', request_contact: true } as Btn]], resize_keyboard: true, one_time_keyboard: true }
export const noKeyboard = { remove_keyboard: true }

// Подпись ссылок: c<id>_<hmac> — ссылка конкретной машины, m_<hmac> — подключение мастера.
const sign = (v: string) => crypto.createHmac('sha256', process.env.SESSION_SECRET!).update('tg:' + v).digest('base64url').slice(0, 12)
export const carPayload = (carId: number) => `c${carId}_${sign('car' + carId)}`
export const masterPayload = () => `m_${sign('master')}`
// Личная ссылка на самозапись из бота: /zapis?k=<чат>.<подпись> — имя, телефон и машины клиента подставятся сами
export const bookingLink = (chatId: string | number) => `${BOOKING_URL}?k=${chatId}.${sign('book' + chatId)}`
export function chatFromBookingKey(k?: string) {
    const m = /^(-?\d+)\.([\w-]+)$/.exec(k ?? '')
    return m && m[2] === sign('book' + m[1]) ? m[1] : null
}
export const carLink = (carId: number) => `https://t.me/${BOT}?start=${carPayload(carId)}`
export const masterLink = () => `https://t.me/${BOT}?start=${masterPayload()}`
export const botLink = () => `https://t.me/${BOT}`
export function carFromPayload(p: string) {
    const m = /^c(\d+)_([\w-]+)$/.exec(p)
    return m && m[2] === sign('car' + m[1]) ? Number(m[1]) : null
}

// Мастера в Telegram (может быть несколько): всем приходят сообщения клиентов и заявки, ответить может любой.
export type TgMaster = { chat_id: string; name: string }
export async function getMasters() {
    return sql<TgMaster[]>`SELECT chat_id::text, name FROM tg_masters ORDER BY created_at`
}
export async function addMaster(chatId: string, name: string) {
    await sql`INSERT INTO tg_masters (chat_id, name) VALUES (${chatId}, ${name}) ON CONFLICT (chat_id) DO UPDATE SET name = EXCLUDED.name`
}
export async function removeMaster(chatId: string) {
    await sql`DELETE FROM tg_masters WHERE chat_id = ${chatId}`
}
// Разослать всем мастерам (кроме except). clientChat — это копия сообщения клиента: запоминаем, чтобы Reply ушёл ему.
// copy — само сообщение клиента (фото, голосовое, файл): копируем его мастеру под текстом-заголовком.
export async function notifyMasters(text: string, opts: { except?: string; clientChat?: string; copy?: { fromChat: string; messageId: number } } = {}) {
    for (const m of await getMasters()) {
        if (m.chat_id === opts.except) continue
        try {
            const ids = [(await tgSend(m.chat_id, text)).message_id]
            if (opts.copy) {
                try { ids.push((await tgCopy(m.chat_id, opts.copy.fromChat, opts.copy.messageId)).message_id) }
                catch (e) { console.error('tg copy', m.chat_id, e); await tgSend(m.chat_id, '⚠️ Не удалось переслать вложение — откройте «Ящик» в приложении.') }
            }
            if (opts.clientChat) for (const id of ids) await sql`INSERT INTO tg_relay (master_chat, master_msg_id, client_chat) VALUES (${m.chat_id}, ${id}, ${opts.clientChat}) ON CONFLICT DO NOTHING`
        } catch (e) { console.error('tg master', m.chat_id, e) }
    }
}
export const tgCopy = (toChat: string | number, fromChat: string | number, messageId: number) =>
    tgApi<{ message_id: number }>('copyMessage', { chat_id: toChat, from_chat_id: fromChat, message_id: messageId })

// Вложение сообщения Telegram: вид, file_id и подпись для «Ящика»
export type TgMedia = { kind: string; fileId: string; label: string }
type F = { file_id: string }
export function mediaOf(m: { photo?: F[]; voice?: F; audio?: F; video?: F; video_note?: F; document?: F & { file_name?: string }; sticker?: F & { emoji?: string } }): TgMedia | null {
    if (m.photo?.length) return { kind: 'photo', fileId: m.photo[m.photo.length - 1].file_id, label: '📷 Фото' }
    if (m.voice) return { kind: 'voice', fileId: m.voice.file_id, label: '🎤 Голосовое' }
    if (m.audio) return { kind: 'audio', fileId: m.audio.file_id, label: '🎵 Аудио' }
    if (m.video) return { kind: 'video', fileId: m.video.file_id, label: '🎬 Видео' }
    if (m.video_note) return { kind: 'video_note', fileId: m.video_note.file_id, label: '⭕ Видеосообщение' }
    if (m.document) return { kind: 'document', fileId: m.document.file_id, label: `📎 ${m.document.file_name || 'Файл'}` }
    if (m.sticker) return { kind: 'sticker', fileId: m.sticker.file_id, label: `${m.sticker.emoji || '🙂'} Стикер` }
    return null
}

// Машины клиента по номеру телефона (сравниваем только цифры, 8… = 7…)
export async function carsByPhone(phone: string) {
    const d = phoneDigits(phone)
    if (d.length < 10) return []
    return sql<{ id: number }[]>`SELECT id FROM cars WHERE regexp_replace(owner_phone, '[^0-9]', '', 'g') IN (${d}, ${'8' + d.slice(1)})`
}

// Сообщение клиенту от мастера: отправить и записать в переписку. Если клиент заблокировал бота — отвязываем.
export async function sendToClient(chatId: string, text: string, extra: Extra = {}) {
    try {
        await tgSend(chatId, text, extra)
    } catch (e) {
        if ((e as { code?: number }).code === 403) {
            await sql`UPDATE cars SET tg_chat_id = NULL WHERE tg_chat_id = ${chatId}`
            throw new Error('Клиент отключил бота — подписка снята')
        }
        throw e
    }
    await sql`INSERT INTO tg_messages (chat_id, out, text, seen) VALUES (${chatId}, true, ${text}, true)`
}

export type TgThread = {
    chat_id: string; name: string; username: string; phone: string; last_text: string; last_out: boolean; last_at: string; unread: number
    cars: { id: number; plate: string; brand: string; model: string }[]
}
export async function getThreads() {
    return sql<TgThread[]>`
        SELECT ch.chat_id::text, ch.name, ch.username, ch.phone, coalesce(m.text, '') AS last_text, coalesce(m.out, false) AS last_out,
               coalesce(m.created_at, ch.created_at) AS last_at,
               (SELECT count(*)::int FROM tg_messages u WHERE u.chat_id = ch.chat_id AND NOT u.out AND NOT u.seen) AS unread,
               coalesce((SELECT json_agg(json_build_object('id', c.id, 'plate', c.plate, 'brand', c.brand, 'model', c.model) ORDER BY c.id)
                         FROM cars c WHERE c.tg_chat_id = ch.chat_id), '[]') AS cars
        FROM tg_chats ch
        LEFT JOIN LATERAL (SELECT text, out, created_at FROM tg_messages x WHERE x.chat_id = ch.chat_id ORDER BY x.id DESC LIMIT 1) m ON true
        ORDER BY 7 DESC LIMIT 100`
}
export async function getThread(chatId: string) {
    const [chat] = await sql<{ chat_id: string; name: string; username: string; phone: string }[]>`
        SELECT chat_id::text, name, username, phone FROM tg_chats WHERE chat_id = ${chatId}`
    if (!chat) return null
    const messages = await sql<{ id: number; out: boolean; text: string; created_at: string; media_kind: string }[]>`
        SELECT id, out, text, created_at, media_kind FROM (SELECT * FROM tg_messages WHERE chat_id = ${chatId} ORDER BY id DESC LIMIT 200) t ORDER BY id`
    const cars = await sql<{ id: number; plate: string; brand: string; model: string }[]>`
        SELECT id, plate, brand, model FROM cars WHERE tg_chat_id = ${chatId} ORDER BY id`
    return { ...chat, messages, cars }
}
export async function unreadCount() {
    const [r] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM tg_messages WHERE NOT out AND NOT seen`
    return r.n
}

// Голосовое клиенту: звук + тот же текст подписью (подпись в Telegram — до 1024 знаков).
export async function sendVoiceToClient(chatId: string, audio: Buffer, text: string) {
    const form = new FormData()
    form.append('chat_id', chatId)
    form.append('voice', new Blob([audio], { type: 'audio/mpeg' }), 'garaggio.mp3')
    if (text.length <= 1024) form.append('caption', text)
    const r = await fetch(`${process.env.TG_API_BASE || 'https://api.telegram.org'}/bot${process.env.TG_BOT_TOKEN}/sendVoice`, { method: 'POST', body: form, cache: 'no-store' })
    const j = await r.json() as { ok: boolean; description?: string; error_code?: number }
    if (!j.ok) {
        if (j.error_code === 403) {
            await sql`UPDATE cars SET tg_chat_id = NULL WHERE tg_chat_id = ${chatId}`
            throw new Error('Клиент отключил бота — подписка снята')
        }
        if (/VOICE_MESSAGES_FORBIDDEN/.test(j.description ?? '')) throw new Error('Клиент запретил голосовые в Telegram — отправьте текстом')
        throw new Error(j.description || 'telegram error')
    }
    if (text.length > 1024) await tgSend(chatId, text)
    await sql`INSERT INTO tg_messages (chat_id, out, text, seen) VALUES (${chatId}, true, ${'🔊 ' + text}, true)`
}
