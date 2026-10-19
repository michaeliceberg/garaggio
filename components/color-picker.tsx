'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { COLORS } from '@/lib/car-dicts'

// Цвет: кружки стандартных цветов + поле для своего («мокрый асфальт»).
export function ColorPicker({ defaultValue }: { defaultValue?: string }) {
    const [v, setV] = useState(defaultValue ?? '')
    useEffect(() => {
        const on = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.field === 'color') setV(String(d.value)) }
        window.addEventListener('garaggio:fill', on)
        return () => window.removeEventListener('garaggio:fill', on)
    }, [])
    const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е')
    return (
        <div className="col-span-2">
            <label className="label" htmlFor="color">Цвет</label>
            <div className="mb-2 flex flex-wrap gap-2">
                {COLORS.map((c) => {
                    const on = norm(v) === norm(c.name)
                    return (
                        <button key={c.name} type="button" onClick={() => setV(on ? '' : c.name)} title={c.name} aria-label={c.name}
                            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${on ? 'border-gold scale-110' : 'border-line'}`}
                            style={{ background: c.hex }}>
                            {on && <Check size={18} strokeWidth={3} color={['белый', 'серебристый', 'жёлтый', 'бежевый', 'голубой'].includes(c.name) ? '#14181C' : '#fff'} />}
                        </button>
                    )
                })}
            </div>
            <input id="color" name="color" value={v} onChange={(e) => setV(e.target.value)} placeholder="или свой: мокрый асфальт" className="input" />
        </div>
    )
}
