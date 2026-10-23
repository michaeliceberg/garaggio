'use client'

import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { PhotoCrop } from './photo-crop'

export const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b) })

// Фото машины в форме: скруглённый квадрат, как у цветов. Фото сжимается в браузере и уходит вместе с формой.
export function CarPhotoField({ current }: { current?: string }) {
    const input = useRef<HTMLInputElement>(null)
    const [data, setData] = useState('')
    const [removed, setRemoved] = useState(false)
    const [busy, setBusy] = useState(false)
    const shown = data || (removed ? '' : current ?? '')
    const [crop, setCrop] = useState<File | null>(null)
    const pick = async (f?: Blob) => {
        if (!f) return
        setCrop(null)
        setBusy(true)
        try { setData(await blobToDataUrl(f)); setRemoved(false) } finally { setBusy(false) }
    }
    return (
        <div className="col-span-2">
            <label className="label">Фото машины</label>
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => input.current?.click()} aria-label="Выбрать фото машины"
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border-2 border-dashed border-line bg-bg text-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : <Camera size={24} />}
                    {busy && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">…</span>}
                </button>
                <div className="flex flex-col gap-1 text-sm text-muted">
                    <span>{shown ? 'Нажми, чтобы заменить' : 'Сфоткай машину — будет на карточке и в списке'}</span>
                    {shown && <button type="button" className="flex w-fit items-center gap-1 font-semibold text-tomato" onClick={() => { setData(''); setRemoved(true) }}><X size={14} />Убрать фото</button>}
                </div>
            </div>
            <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCrop(f); e.target.value = '' }} />
            {crop && <PhotoCrop file={crop} onDone={pick} onCancel={() => setCrop(null)} />}
            <input type="hidden" name="photo_data" value={data} />
            <input type="hidden" name="photo_remove" value={removed && !data ? '1' : ''} />
        </div>
    )
}
