import 'server-only'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

// Озвучка ElevenLabs. С сервера api.elevenlabs.io закрыт — ходим через Cloudflare-прокси (ELEVENLABS_API_BASE).
// Голос — Chuck Miller, модель v4 с пометками настроения ([cheerful], [warmly]): так звучит веселее и по-дружески.
// Готовый звук храним на диске по хешу текста: один и тот же текст второй раз не оплачиваем.
const BASE = process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io'
const VOICE = process.env.ELEVENLABS_VOICE_ID || 'HIGUfNOdjuWQwwapnTRW'
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_v4'
export const ttsEnabled = () => !!process.env.ELEVENLABS_API_KEY

// Текст сообщения → текст для голоса: без ссылок и эмодзи, «Garaggio» по-русски, весёлое начало и тёплое прощание.
export function voiceText(text: string) {
    let t = text
        .replace(/https?:\/\/\S+/g, 'ссылка в сообщении')
        .replace(/Garaggio/gi, 'Гараджио')
        // эмодзи между фразами работает как точка: «Это Garaggio 🤌 Вашему…» → «Это Гараджио. Вашему…»
        .replace(/[ \t]*[\p{Extended_Pictographic}\u{FE0F}\u{200D}]+[ \t]*/gu, '. ')
        .replace(/([!?.,:;])\s*\.\s/g, '$1 ')
        .replace(/\.\s*$/g, '.')
        .replace(/\s+([,.!?:;])/g, '$1')
        .replace(/\s{2,}/g, ' ')
        .trim()
    t = t.replace(/(^|[.!?]\s+)(Грацие|Спасибо)/, '$1[warmly] $2')
    // смешок после приветствия, как в выбранном образце: «Это Гараджио! [laughs] Вашему…»
    t = /Это Гараджио[.!]/.test(t)
        ? t.replace(/Это Гараджио[.!]/, 'Это Гараджио! [laughs]')
        : t.replace(/^([^.!?]+[.!?])\s+/, '$1 [laughs] ')
    return `[cheerful] ${t}`
}

export async function synthesize(text: string) {
    const spoken = voiceText(text)
    const hash = crypto.createHash('sha256').update(`${VOICE}|${MODEL}|${spoken}`).digest('hex').slice(0, 32)
    const dir = path.join(process.env.UPLOAD_DIR!, 'tts')
    const file = path.join(dir, `${hash}.mp3`)
    try { return { audio: await fs.readFile(file), hash } } catch { /* ещё не озвучивали */ }
    const r = await fetch(`${BASE}/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
        method: 'POST', cache: 'no-store',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY!, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spoken, model_id: MODEL, voice_settings: { stability: 0, similarity_boost: 0.75 } }),
    })
    if (!r.ok || !r.headers.get('content-type')?.startsWith('audio/')) {
        console.error('tts', r.status, (await r.text()).slice(0, 300))
        throw new Error('Не получилось озвучить — попробуйте ещё раз')
    }
    const audio = Buffer.from(await r.arrayBuffer())
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(file, audio)
    return { audio, hash }
}
