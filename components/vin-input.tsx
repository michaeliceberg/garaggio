'use client'

import { useEffect, useState } from 'react'
import { normVin } from '@/lib/format'

// Поле VIN: что бы ни набрали (русская раскладка, строчные, пробелы) — сразу латиница заглавными, максимум 17 знаков.
export function VinInput({ defaultValue }: { defaultValue?: string }) {
    const [v, setV] = useState(normVin(defaultValue ?? ''))
    // заполнение с фото (CarPhotoScan)
    useEffect(() => {
        const on = (e: Event) => setV(normVin(String((e as CustomEvent).detail ?? '')))
        window.addEventListener('garaggio:vin', on)
        return () => window.removeEventListener('garaggio:vin', on)
    }, [])
    return (
        <div className="col-span-2">
            <label className="label" htmlFor="vin">VIN <span className="font-normal text-muted/70">{v.length}/17</span></label>
            <input id="vin" name="vin" value={v} onChange={(e) => setV(normVin(e.target.value))} placeholder="WDC1641861A123456"
                autoCapitalize="characters" autoCorrect="off" spellCheck={false} className="input font-mono uppercase tracking-wider" />
        </div>
    )
}
