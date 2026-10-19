import 'server-only'
import crypto from 'node:crypto'
import { sql } from './db'
import { phoneDigits } from './messages'

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
export const carLink = (carId: number) => `https://t.me/${BOT}?start=${carPayload(carId)}`
export const masterLink = () => `https://t.me/${BOT}?start=${masterPayload()}`
export const botLink = () => `https://t.me/${BOT}`
export function carFromPayload(p: string) {
    const m = /^c(\d+)_([\w-]+)$/.exec(p)
    return m && m[2] === sign('car' + m[1]) ? Number(m[1]) : null
}

export async function getMasterChat() {
    const [r] = await sql<{ value: string }[]>`SELECT value FROM settings WHERE key = 'tg_master_chat'`
    return r?.value || null
}
export async function setMasterChat(chatId: string) {
    await sql`INSERT INTO settings (key, value) VALUES ('tg_master_chat', ${chatId}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`
}

// Машины клиента по номеру телефона (сравниваем только цифры, 8… = 7…)
export async function carsByPhone(phone: string) {
    const d = phoneDigits(phone)
    if (d.length < 10) return []
    return sql<{ id: number }[]>`SELECT id FROM cars WHERE regexp_replace(owner_phone, '[^0-9]', '', 'g') IN (${d}, ${'8' + d.slice(1)})`
}

// Сообщение клиенту от мастера: отправить и записать в переписку. Если клиент заблокировал бота — отвязываем.
export async function sendToClient(chatId: string, text: string) {
    try {
        await tgSend(chatId, text)
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
    const messages = await sql<{ id: number; out: boolean; text: string; created_at: string }[]>`
        SELECT id, out, text, created_at FROM (SELECT * FROM tg_messages WHERE chat_id = ${chatId} ORDER BY id DESC LIMIT 200) t ORDER BY id`
    const cars = await sql<{ id: number; plate: string; brand: string; model: string }[]>`
        SELECT id, plate, brand, model FROM cars WHERE tg_chat_id = ${chatId} ORDER BY id`
    return { ...chat, messages, cars }
}
export async function unreadCount() {
    const [r] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM tg_messages WHERE NOT out AND NOT seen`
    return r.n
}
