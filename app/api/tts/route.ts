import { isAuthed } from '@/lib/auth'
import { synthesize, ttsEnabled } from '@/lib/tts'

// Прослушать голосовое перед отправкой (только мастеру). Озвученное кешируется — повторно не платим.
export async function POST(req: Request) {
    if (!isAuthed()) return new Response('auth', { status: 401 })
    if (!ttsEnabled()) return new Response('tts off', { status: 404 })
    const { text } = await req.json().catch(() => ({ text: '' })) as { text?: string }
    const t = (text ?? '').trim()
    if (!t || t.length > 1500) return new Response('bad text', { status: 400 })
    try {
        const { audio } = await synthesize(t)
        return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
    } catch (e) {
        return new Response((e as Error).message, { status: 502 })
    }
}
