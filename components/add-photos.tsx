'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { compressPhoto, uploadPhoto } from '@/lib/photo-client'
import { PhotoPicker, type PendingPhoto } from './photo-picker'

// Дозагрузка фото к уже сохранённому визиту.
export function AddPhotos({ visitId }: { visitId: number }) {
    const router = useRouter()
    const [photos, setPhotos] = useState<PendingPhoto[]>([])
    const [busy, setBusy] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const send = async () => {
        setError(null)
        try {
            for (let i = 0; i < photos.length; i++) {
                setBusy(`Загружаем ${i + 1} из ${photos.length}…`)
                await uploadPhoto(visitId, await compressPhoto(photos[i].file), photos[i].kind)
            }
            setPhotos([]); setBusy(null); router.refresh()
        } catch {
            setError('Не получилось загрузить. Проверьте интернет.'); setBusy(null)
        }
    }
    return (
        <div className="flex flex-col gap-3">
            <PhotoPicker photos={photos} onChange={setPhotos} />
            {error && <p className="text-sm font-semibold text-tomato">{error}</p>}
            {photos.length > 0 && <button type="button" className="btn-primary" onClick={send} disabled={!!busy}>{busy ?? `Загрузить ${photos.length} фото`}</button>}
        </div>
    )
}
