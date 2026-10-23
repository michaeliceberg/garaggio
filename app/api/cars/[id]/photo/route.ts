import fs from 'node:fs/promises'
import path from 'node:path'
import { sql } from '@/lib/db'
import { isAuthed } from '@/lib/auth'

// Аватарка машины — только мастеру. В адресе ?v=<файл>, поэтому кэш можно держать вечно: новое фото = новый адрес.
export async function GET(_: Request, { params }: { params: { id: string } }) {
    if (!isAuthed()) return new Response('auth', { status: 401 })
    const [c] = await sql<{ photo: string }[]>`SELECT photo FROM cars WHERE id = ${Number(params.id)}`
    if (!c?.photo) return new Response('not found', { status: 404 })
    try {
        const buf = await fs.readFile(path.join(process.env.UPLOAD_DIR!, c.photo))
        return new Response(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable' } })
    } catch {
        return new Response('file missing', { status: 404 })
    }
}
