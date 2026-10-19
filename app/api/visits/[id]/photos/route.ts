import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { isAuthed } from '@/lib/auth'

const KINDS = new Set(['before', 'after', 'part', 'odometer', 'other'])

// Загрузка одного фото к визиту (браузер уже сжал его до ~1600px JPEG).
export async function POST(req: Request, { params }: { params: { id: string } }) {
    if (!isAuthed()) return NextResponse.json({ error: 'auth' }, { status: 401 })
    const visitId = Number(params.id)
    const [v] = await sql`SELECT id FROM visits WHERE id = ${visitId}`
    if (!v) return NextResponse.json({ error: 'no visit' }, { status: 404 })
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'no file' }, { status: 400 })
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'too big' }, { status: 413 })
    const kind = KINDS.has(String(form.get('kind'))) ? String(form.get('kind')) : 'other'
    const rel = `${visitId}/${crypto.randomUUID()}.jpg`
    const abs = path.join(process.env.UPLOAD_DIR!, rel)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, Buffer.from(await file.arrayBuffer()))
    const [p] = await sql<{ id: number }[]>`INSERT INTO photos (visit_id, file, kind) VALUES (${visitId}, ${rel}, ${kind}) RETURNING id`
    return NextResponse.json({ id: p.id })
}
