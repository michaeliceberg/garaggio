// Опросчик Telegram для бота Garaggio (отдельный pm2-процесс `garaggio-tg-poller`).
// С сервера Telegram напрямую недоступен, и вебхук до сервера не доходит, поэтому:
// ходим к Telegram через прокси (TG_API_BASE) long-polling'ом и каждое обновление
// отдаём в наш же /api/tg на localhost — вся логика бота остаётся там.
//   pm2 start "node --env-file=.env scripts/tg-poller.mjs" --name garaggio-tg-poller
import fs from 'node:fs'
import path from 'node:path'

const TOKEN = process.env.TG_BOT_TOKEN
const BASE = process.env.TG_API_BASE || 'https://api.telegram.org'
const LOCAL = `http://127.0.0.1:${process.env.PORT || 3005}/api/tg`
const OFFSET_FILE = path.join(process.env.UPLOAD_DIR || '.', 'tg-offset.json')

const api = async (method, body, timeoutMs = 40_000) => {
    const r = await fetch(`${BASE}/bot${TOKEN}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
    })
    const j = await r.json()
    if (!j.ok) throw new Error(`${method}: ${j.description}`)
    return j.result
}
const readOffset = () => { try { return JSON.parse(fs.readFileSync(OFFSET_FILE, 'utf8')).offset ?? 0 } catch { return 0 } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Один раз при старте: убрать вебхук (иначе getUpdates не работает), команды и описание бота.
await api('deleteWebhook', {}).catch((e) => console.error(e.message))
await api('setMyCommands', { commands: [{ command: 'zapis', description: 'Записаться на удобное время' }, { command: 'start', description: 'Подписаться на напоминания' }, { command: 'stop', description: 'Отписаться' }] }).catch((e) => console.error(e.message))
await api('setMyDescription', { description: 'Чао! Это Garaggio 🤌 — гараж, где о вашей машине помнят всё.\n\n📅 Записаться на удобное время: garaggio.ru/zapis\n🔧 Напомним, когда пора на ТО\n📋 Пришлём отчёт после визита с фото\n💬 Можно написать Маэстро прямо сюда\n\nНажмите «Старт» и поделитесь номером — мы найдём вашу машину. Грацие!' }).catch((e) => console.error(e.message))
await api('setMyShortDescription', { short_description: 'Garaggio 🤌 Запись онлайн: garaggio.ru/zapis · напоминания о ТО · связь с Маэстро' }).catch((e) => console.error(e.message))
console.log('garaggio tg poller started')

let offset = readOffset()
for (;;) {
    try {
        const updates = await api('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] })
        for (const u of updates) {
            try {
                const r = await fetch(LOCAL, {
                    method: 'POST', body: JSON.stringify(u),
                    headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': process.env.TG_WEBHOOK_SECRET },
                })
                if (!r.ok) console.error('local', r.status)
            } catch (e) { console.error('local', e.message) }
            offset = u.update_id + 1
            fs.writeFileSync(OFFSET_FILE, JSON.stringify({ offset }))
        }
    } catch (e) {
        console.error('poll', e.message)
        await sleep(5000)
    }
}
