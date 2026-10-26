import { sql } from '@/lib/db'
import { isAuthed } from '@/lib/auth'
import { tgApi } from '@/lib/tg'

// Вложение из переписки (фото, голосовое, видео, файл) — только мастеру. Сам файл не храним: берём у Telegram по file_id.
const TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', oga: 'audio/ogg', ogg: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf' }

export async function GET(_: Request, { params }: { params: { id: string } }) {
    if (!isAuthed()) return new Response('auth', { status: 401 })
    const [m] = await sql<{ file_id: string }[]>`SELECT file_id FROM tg_messages WHERE id = ${Number(params.id)} AND file_id <> ''`
    if (!m) return new Response('not found', { status: 404 })
    try {
        const f = await tgApi<{ file_path: string }>('getFile', { file_id: m.file_id })
        const r = await fetch(`${process.env.TG_API_BASE || 'https://api.telegram.org'}/file/bot${process.env.TG_BOT_TOKEN}/${f.file_path}`, { cache: 'no-store' })
        if (!r.ok) return new Response('telegram file', { status: 502 })
        const ext = f.file_path.split('.').pop()?.toLowerCase() ?? ''
        return new Response(await r.arrayBuffer(), { headers: { 'Content-Type': TYPES[ext] ?? r.headers.get('content-type') ?? 'application/octet-stream', 'Cache-Control': 'private, max-age=86400' } })
    } catch (e) {
        // getFile отдаёт файлы до 20 МБ — больше смотрим в самом Telegram
        return new Response((e as Error).message, { status: 502 })
    }
}
