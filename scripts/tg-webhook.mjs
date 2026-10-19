// Подключить вебхук бота: node --env-file=.env scripts/tg-webhook.mjs [https://garaggio.ru]
// Нужны TG_BOT_TOKEN и TG_WEBHOOK_SECRET в .env.
const base = process.argv[2] || 'https://garaggio.ru'
const api = (m, body) => fetch(`https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/${m}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}).then((r) => r.json())
console.log(await api('setWebhook', { url: `${base}/api/tg`, secret_token: process.env.TG_WEBHOOK_SECRET, allowed_updates: ['message'], drop_pending_updates: true }))
console.log(await api('setMyCommands', { commands: [{ command: 'start', description: 'Подписаться на напоминания' }, { command: 'stop', description: 'Отписаться' }] }))
console.log(await api('setMyDescription', { description: 'Garaggio 🤌 — напоминания о ТО, отчёты после визита и связь с мастером.' }))
console.log(await api('setMyShortDescription', { short_description: 'Garaggio: напоминания о ТО и связь с мастером' }))
