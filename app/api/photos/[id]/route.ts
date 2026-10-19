import fs from 'node:fs/promises'
import path from 'node:path'
import { sql } from '@/lib/db'
import { isAuthed } from '@/lib/auth'

// Фото отдаём только мастеру (по cookie входа), не публично.
export async function GET(_: Request, { params }: { params: { id: string } }) {
    if (!isAuthed()) return new Response('auth', { status: 401 })
    const [p] = await sql<{ file: string }[]>`SELECT file FROM photos WHERE id = ${Number(params.id)}`
    if (!p) return new Response('not found', { status: 404 })
    try {
        const buf = await fs.readFile(path.join(process.env.UPLOAD_DIR!, p.file))
        return new Response(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable' } })
    } catch {
        return new Response('file missing', { status: 404 })
    }
}
