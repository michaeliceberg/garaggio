import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import { recognizeCar } from '@/lib/ai'
import { normVin } from '@/lib/format'

const TMP_DIR = () => path.join(process.env.UPLOAD_DIR!, 'tmp')

// Фото номера / СТС → поля карточки машины. Фото кладём во временный файл с одноразовой ссылкой
// (Anthropic скачивает его сам), после разбора удаляем.
export async function POST(req: Request) {
    if (!isAuthed()) return NextResponse.json({ error: 'auth' }, { status: 401 })
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'no-ai' }, { status: 503 })
    const f = (await req.formData()).get('photo')
    if (!(f instanceof Blob) || f.size > 8_000_000) return NextResponse.json({ error: 'bad' }, { status: 400 })
    const buf = Buffer.from(await f.arrayBuffer())
    const id = crypto.randomUUID()
    const file = path.join(TMP_DIR(), `${id}.jpg`)
    try {
        await fs.mkdir(TMP_DIR(), { recursive: true })
        // подчистить забытые старше 10 минут
        for (const n of await fs.readdir(TMP_DIR())) {
            const st = await fs.stat(path.join(TMP_DIR(), n)).catch(() => null)
            if (st && Date.now() - st.mtimeMs > 600_000) await fs.rm(path.join(TMP_DIR(), n), { force: true })
        }
        const image = process.env.ANTHROPIC_BASE_URL
            ? (await fs.writeFile(file, buf), { url: `${process.env.PUBLIC_URL ?? 'https://garaggio.ru'}/api/tmp-photo/${id}` })
            : { base64: buf.toString('base64') }
        let car = await recognizeCar(image)
        // ничего не прочитала быстрая модель — пробуем модель посильнее
        if (!car.plate && !car.vin && !car.brand) car = await recognizeCar(image, 'claude-sonnet-5-5')
        return NextResponse.json({ ...car, vin: normVin(car.vin) })
    } catch (e) {
        console.error('recognize-car', e)
        return NextResponse.json({ error: 'ai' }, { status: 502 })
    } finally {
        await fs.rm(file, { force: true })
    }
}
