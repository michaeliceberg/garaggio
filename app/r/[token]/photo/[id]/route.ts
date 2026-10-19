import fs from 'node:fs/promises'
import path from 'node:path'
import { sql } from '@/lib/db'

// Фото для отчёта клиенту: доступно только по секретной ссылке визита и только фото этого визита.
export async function GET(_: Request, { params }: { params: { token: string; id: string } }) {
    const [p] = await sql<{ file: string }[]>`
        SELECT p.file FROM photos p JOIN visits v ON v.id = p.visit_id
        WHERE p.id = ${Number(params.id)} AND v.share_token = ${params.token}`
    if (!p) return new Response('not found', { status: 404 })
    try {
        const buf = await fs.readFile(path.join(process.env.UPLOAD_DIR!, p.file))
        return new Response(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' } })
    } catch {
        return new Response('file missing', { status: 404 })
    }
}
