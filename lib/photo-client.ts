// Сжатие фото в браузере перед отправкой: длинная сторона до 1600 px, JPEG ~0.82 (обычно 200–400 КБ вместо 3–5 МБ).
export async function compressPhoto(file: File, MAX = 1600): Promise<Blob> {
    try {
        const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
        const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(bmp.width * k)
        canvas.height = Math.round(bmp.height * k)
        canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
        bmp.close()
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
        return blob ?? file
    } catch {
        return file // не получилось разобрать (редкий формат) — отправляем как есть
    }
}

export type PhotoKind = 'before' | 'after' | 'part' | 'odometer' | 'other'
export const PHOTO_KINDS: { id: PhotoKind; label: string }[] = [
    { id: 'before', label: 'До' },
    { id: 'after', label: 'После' },
    { id: 'part', label: 'Старая деталь' },
    { id: 'odometer', label: 'Пробег' },
    { id: 'other', label: 'Другое' },
]
export const kindLabel = (k: string) => PHOTO_KINDS.find((x) => x.id === k)?.label ?? 'Другое'

export async function uploadPhoto(visitId: number, blob: Blob, kind: PhotoKind) {
    const f = new FormData()
    f.append('file', blob, 'photo.jpg')
    f.append('kind', kind)
    const res = await fetch(`/api/visits/${visitId}/photos`, { method: 'POST', body: f })
    if (!res.ok) throw new Error(`upload ${res.status}`)
}
