'use client'

import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { setCarPhoto } from '@/app/actions'
import { PhotoCrop } from './photo-crop'
import { blobToDataUrl } from './car-photo-field'

// Аватарка на карточке машины: нажал — выбрал фото — сразу сохранилось.
export function CarPhotoTile({ carId, url, color }: { carId: number; url: string; color: string }) {
    const input = useRef<HTMLInputElement>(null)
    const [busy, setBusy] = useState(false)
    const [preview, setPreview] = useState('')
    const [crop, setCrop] = useState<File | null>(null)
    const pick = async (f?: Blob) => {
        if (!f) return
        setCrop(null)
        setBusy(true)
        try {
            const d = await blobToDataUrl(f)
            setPreview(d)
            await setCarPhoto(carId, d)
        } finally { setBusy(false) }
    }
    const src = preview || url
    return (
        <>
            <button type="button" onClick={() => input.current?.click()} aria-label={src ? 'Заменить фото машины' : 'Добавить фото машины'}
                className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] border-2 border-line"
                style={src ? undefined : { background: `${color}26`, borderStyle: 'dashed' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <Camera size={24} color={color} />}
                {busy && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">…</span>}
            </button>
            <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCrop(f); e.target.value = '' }} />
            {crop && <PhotoCrop file={crop} onDone={pick} onCancel={() => setCrop(null)} />}
        </>
    )
}
