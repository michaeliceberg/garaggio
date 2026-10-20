'use client'

import { useEffect, useState } from 'react'
import { suggestModels } from '@/lib/car-dicts'

// Модель: подсказки с первых букв по выбранной марке (Toyota → Camry, Corolla…), понимает «камри», «крузак».
// Если марка ещё пустая — ищем по всем маркам и при выборе подставляем марку тоже.
export function ModelInput({ defaultValue, defaultBrand, known }: { defaultValue?: string; defaultBrand?: string; known: { brand: string; model: string }[] }) {
    const [v, setV] = useState(defaultValue ?? '')
    const [brand, setBrand] = useState(defaultBrand ?? '')
    const [open, setOpen] = useState(false)
    useEffect(() => {
        const fill = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.field === 'model') setV(String(d.value)); if (d?.field === 'brand') setBrand(String(d.value)) }
        const onBrand = (e: Event) => setBrand(String((e as CustomEvent).detail ?? ''))
        window.addEventListener('garaggio:fill', fill)
        window.addEventListener('garaggio:brand', onBrand)
        return () => { window.removeEventListener('garaggio:fill', fill); window.removeEventListener('garaggio:brand', onBrand) }
    }, [])
    const list = open ? suggestModels(v, brand, known) : []
    const pick = (b: string, m: string) => {
        setV(m); setOpen(false)
        if (!brand.trim()) window.dispatchEvent(new CustomEvent('garaggio:fill', { detail: { field: 'brand', value: b } }))
        document.getElementById('year')?.focus()
    }
    return (
        <div className="relative">
            <label className="label" htmlFor="model">Модель</label>
            <input id="model" name="model" value={v} autoComplete="off" autoCorrect="off" placeholder={brand ? 'Начните вводить' : 'ML500'} className="input"
                onChange={(e) => { setV(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
            {list.length > 0 && (
                <div className="absolute inset-x-0 top-full z-10 mt-1 flex flex-col overflow-hidden rounded-xl border border-line bg-card shadow-xl">
                    {list.map((h) => (
                        <button key={`${h.brand}|${h.model}`} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(h.brand, h.model)}
                            className="px-3 py-2.5 text-left font-semibold hover:bg-bg active:bg-bg">
                            {!brand.trim() && <span className="mr-1 text-muted">{h.brand}</span>}{h.model}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
