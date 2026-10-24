'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { deletePhoto } from '@/app/actions'
import { ConfirmButton } from './confirm-button'

// Фото визита: сетка миниатюр, по тапу — просмотр на весь экран на тёмном фоне.
// Закрыть: ✕, тап мимо фото, кнопка «Назад» телефона, Esc. Листать: свайп влево/вправо, стрелки.
// visitId — показываем мастеру кнопку удаления фото (в отчёте клиенту её нет).
export function PhotoGallery({ photos, cols = 3, visitId }: { photos: { id: number; src: string }[]; cols?: 2 | 3; visitId?: number }) {
    const [open, setOpen] = useState<number | null>(null)
    const fromHistory = useRef(false)

    const show = (i: number) => {
        setOpen(i)
        history.pushState({ garaggioPhoto: true }, '') // «Назад» на телефоне закрывает просмотр, а не уходит со страницы
    }
    const close = useCallback(() => {
        setOpen(null)
        if (!fromHistory.current && history.state?.garaggioPhoto) history.back()
        fromHistory.current = false
    }, [])
    useEffect(() => {
        const onPop = () => { fromHistory.current = true; setOpen(null); fromHistory.current = false }
        window.addEventListener('popstate', onPop)
        return () => window.removeEventListener('popstate', onPop)
    }, [])

    return (
        <>
            <div className={`grid gap-2 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {photos.map((p, i) => (
                    <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                        <button type="button" onClick={() => show(i)} className="block h-full w-full" aria-label={`Открыть фото ${i + 1}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                        </button>
                        {visitId && (
                            <form action={deletePhoto} className="absolute right-1 top-1">
                                <input type="hidden" name="id" value={p.id} />
                                <input type="hidden" name="visit_id" value={visitId} />
                                <ConfirmButton message="Удалить это фото?" className="flex h-7 w-7 items-center justify-center rounded-full bg-black/70"><X size={16} /></ConfirmButton>
                            </form>
                        )}
                    </div>
                ))}
            </div>
            {open !== null && photos[open] && <Viewer photos={photos} index={open} onIndex={setOpen} onClose={close} />}
        </>
    )
}

function Viewer({ photos, index, onIndex, onClose }: { photos: { id: number; src: string }[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
    const n = photos.length
    const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex])
    const touch = useRef<{ x: number; y: number } | null>(null)
    const [dx, setDx] = useState(0)

    useEffect(() => {
        const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1) }
        window.addEventListener('keydown', key)
        const overflow = document.body.style.overflow
        document.body.style.overflow = 'hidden' // страница под фото не прокручивается
        return () => { window.removeEventListener('keydown', key); document.body.style.overflow = overflow }
    }, [go, onClose])

    return createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label="Просмотр фото"
            onClick={onClose}
            onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
            onTouchMove={(e) => { if (touch.current && n > 1) setDx(e.touches[0].clientX - touch.current.x) }}
            onTouchEnd={(e) => {
                const t = touch.current; touch.current = null; setDx(0)
                if (!t) return
                const mx = e.changedTouches[0].clientX - t.x, my = e.changedTouches[0].clientY - t.y
                if (Math.abs(mx) > 50 && Math.abs(mx) > Math.abs(my)) { e.preventDefault(); go(mx < 0 ? 1 : -1) }
                else if (my > 90 && Math.abs(my) > Math.abs(mx)) onClose() // смахнуть вниз — закрыть
            }}>
            <div className="flex items-center justify-between px-3 pt-[max(12px,env(safe-area-inset-top))]">
                <span className="text-sm font-semibold text-white/70">{n > 1 ? `${index + 1} / ${n}` : ''}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Закрыть"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25">
                    <X size={28} />
                </button>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img key={photos[index].id} src={photos[index].src} alt="" onClick={(e) => e.stopPropagation()}
                    className="max-h-full max-w-full select-none rounded-lg object-contain" style={{ transform: `translateX(${dx}px)`, transition: dx ? 'none' : 'transform .2s' }} />
                {n > 1 && (
                    <>
                        <button type="button" onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="Предыдущее фото"
                            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/25">
                            <ChevronLeft size={26} />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="Следующее фото"
                            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/25">
                            <ChevronRight size={26} />
                        </button>
                    </>
                )}
            </div>
            <div className="pb-[max(16px,env(safe-area-inset-bottom))] text-center text-xs text-white/50">Тап мимо фото или ✕ — закрыть{n > 1 ? ' · свайп — листать' : ''}</div>
        </div>,
        document.body,
    )
}
