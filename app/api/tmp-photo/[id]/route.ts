import fs from 'node:fs/promises'
import path from 'node:path'

// Одноразовые фото для распознавания: открываются без входа, но только по случайному uuid и живут секунды.
export async function GET(_: Request, { params }: { params: { id: string } }) {
    if (!/^[0-9a-f-]{36}$/.test(params.id)) return new Response('not found', { status: 404 })
    try {
        const buf = await fs.readFile(path.join(process.env.UPLOAD_DIR!, 'tmp', `${params.id}.jpg`))
        return new Response(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } })
    } catch {
        return new Response('not found', { status: 404 })
    }
}
