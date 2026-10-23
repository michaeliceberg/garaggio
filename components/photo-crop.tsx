'use client'

import { useEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'

const V = 280 // сторона рамки на экране, px
const OUT = 600 // сторона итоговой картинки, px

// Обрезка фото машины: двигаешь фото пальцем, увеличиваешь двумя пальцами или ползунком — в квадрат попадает нужная часть.
export function PhotoCrop({ file, onDone, onCancel }: { file: File; onDone: (b: Blob) => void; onCancel: () => void }) {
    const [img, setImg] = useState<HTMLImageElement | null>(null)
    const [z, setZ] = useState(1)
    const [off, setOff] = useState({ x: 0, y: 0 })
    const pts = useRef(new Map<number, { x: number; y: number }>())
    const pinch = useRef<{ d: number; z: number } | null>(null)

    useEffect(() => {
        const url = URL.createObjectURL(file)
        const i = new Image()
        i.onload = () => {
            setImg(i)
            const s = Math.max(V / i.naturalWidth, V / i.naturalHeight)
            setOff({ x: (V - i.naturalWidth * s) / 2, y: (V - i.naturalHeight * s) / 2 })
        }
        i.src = url
        return () => URL.revokeObjectURL(url)
    }, [file])

    const s0 = img ? Math.max(V / img.naturalWidth, V / img.naturalHeight) : 1
    const s = s0 * z
    const clamp = (o: { x: number; y: number }, sc = s) => img ? {
        x: Math.min(0, Math.max(V - img.naturalWidth * sc, o.x)),
        y: Math.min(0, Math.max(V - img.naturalHeight * sc, o.y)),
    } : o
    // меняем масштаб так, чтобы точка (cx, cy) рамки осталась на месте
    const zoomTo = (nz: number, cx = V / 2, cy = V / 2) => {
        nz = Math.min(4, Math.max(1, nz))
        const ns = s0 * nz
        setOff((o) => clamp({ x: cx - (cx - o.x) * (ns / s), y: cy - (cy - o.y) * (ns / s) }, ns))
        setZ(nz)
    }

    const down = (e: React.PointerEvent) => {
        (e.target as Element).setPointerCapture(e.pointerId)
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pts.current.size === 2) {
            const [a, b] = [...pts.current.values()]
            pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z }
        }
    }
    const move = (e: React.PointerEvent) => {
        const prev = pts.current.get(e.pointerId)
        if (!prev) return
        pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pts.current.size === 2 && pinch.current) {
            const [a, b] = [...pts.current.values()]
            const r = (e.currentTarget as Element).getBoundingClientRect()
            zoomTo(pinch.current.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top)
        } else if (pts.current.size === 1) {
            setOff((o) => clamp({ x: o.x + e.clientX - prev.x, y: o.y + e.clientY - prev.y }))
        }
    }
    const up = (e: React.PointerEvent) => {
        pts.current.delete(e.pointerId)
        if (pts.current.size < 2) pinch.current = null
    }

    const done = () => {
        if (!img) return
        const c = document.createElement('canvas')
        c.width = OUT; c.height = OUT
        c.getContext('2d')!.drawImage(img, -off.x / s, -off.y / s, V / s, V / s, 0, 0, OUT, OUT)
        c.toBlob((b) => b && onDone(b), 'image/jpeg', 0.85)
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4">
            <p className="font-bold text-white">Выбери, что будет на фото</p>
            <div className="relative touch-none select-none overflow-hidden rounded-[28px] border-2 border-gold bg-bg"
                style={{ width: V, height: V }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
                onWheel={(e) => zoomTo(z * (e.deltaY < 0 ? 1.1 : 0.9))}>
                {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
                        style={{ width: img.naturalWidth, height: img.naturalHeight, transform: `translate(${off.x}px, ${off.y}px) scale(${s})` }} />
                )}
            </div>
            <div className="flex w-[280px] items-center gap-3 text-white/80">
                <ZoomOut size={20} />
                <input type="range" min={1} max={4} step={0.01} value={z} onChange={(e) => zoomTo(Number(e.target.value))} className="flex-1 accent-gold" aria-label="Масштаб" />
                <ZoomIn size={20} />
            </div>
            <p className="text-center text-sm text-white/60">Двигай фото пальцем, увеличивай двумя пальцами</p>
            <div className="grid w-[280px] grid-cols-2 gap-2">
                <button type="button" className="btn-ghost" onClick={onCancel}>Отмена</button>
                <button type="button" className="btn-primary" onClick={done} disabled={!img}>Готово</button>
            </div>
        </div>
    )
}
