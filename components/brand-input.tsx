'use client'

import { useEffect, useState } from 'react'
import { suggestBrands } from '@/lib/car-dicts'

// Марка: с первой буквы подсказываем марки кнопками (B → BMW, Bentley…), понимает и «мерс», «тойота».
export function BrandInput({ defaultValue }: { defaultValue?: string }) {
    const [v, setVRaw] = useState(defaultValue ?? '')
    // марку сообщаем полю «Модель» — оно подсказывает модели этой марки
    const setV = (s: string) => { setVRaw(s); window.dispatchEvent(new CustomEvent('garaggio:brand', { detail: s })) }
    const [open, setOpen] = useState(false)
    useEffect(() => {
        const on = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.field === 'brand') setVRaw(String(d.value)) }
        window.addEventListener('garaggio:fill', on)
        return () => window.removeEventListener('garaggio:fill', on)
    }, [])
    const list = open ? suggestBrands(v) : []
    return (
        <div className="relative">
            <label className="label" htmlFor="brand">Марка</label>
            <input id="brand" name="brand" value={v} lang="en" autoCapitalize="words" autoComplete="off" autoCorrect="off" placeholder="Mercedes-Benz" className="input"
                onChange={(e) => { setV(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
            {list.length > 0 && (
                <div className="absolute inset-x-0 top-full z-10 mt-1 flex flex-col overflow-hidden rounded-xl border border-line bg-card shadow-xl">
                    {list.map((b) => (
                        <button key={b} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setV(b); setOpen(false); document.getElementById('model')?.focus() }}
                            className="px-3 py-2.5 text-left font-semibold hover:bg-bg active:bg-bg">{b}</button>
                    ))}
                </div>
            )}
        </div>
    )
}
