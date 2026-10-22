'use client'

import { useEffect, useRef } from 'react'
import { Camera, Images, X } from 'lucide-react'
import type { PhotoKind } from '@/lib/photo-client'

export type PendingPhoto = { key: string; file: File; kind: PhotoKind; url: string }

// Выбор фото: «Снять» (сразу камера) или «Из галереи». Все фото в одной куче, без разделения на «до/после».
export function PhotoPicker({ photos, onChange }: { photos: PendingPhoto[]; onChange: (p: PendingPhoto[]) => void }) {
    const kind: PhotoKind = 'other'
    const cam = useRef<HTMLInputElement>(null)
    const gal = useRef<HTMLInputElement>(null)
    useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []) // eslint-disable-line react-hooks/exhaustive-deps
    const add = (files: FileList | null) => {
        if (!files?.length) return
        const added = [...files].map((file) => ({ key: `${Date.now()}-${Math.random()}`, file, kind, url: URL.createObjectURL(file) }))
        onChange([...photos, ...added])
    }
    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn-ghost" onClick={() => cam.current?.click()}><Camera size={20} />Снять</button>
                <button type="button" className="btn-ghost" onClick={() => gal.current?.click()}><Images size={20} />Из галереи</button>
            </div>
            <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
            <input ref={gal} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = '' }} />
            {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {photos.map((p) => (
                        <div key={p.key} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.url} alt="" className="h-full w-full object-cover" />
                            <button type="button" aria-label="Убрать" onClick={() => { URL.revokeObjectURL(p.url); onChange(photos.filter((x) => x.key !== p.key)) }}
                                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70"><X size={16} /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
