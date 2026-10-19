'use client'

import { useState } from 'react'
import { normVin } from '@/lib/format'

// Поле VIN: что бы ни набрали (русская раскладка, строчные, пробелы) — сразу латиница заглавными, максимум 17 знаков.
export function VinInput({ defaultValue }: { defaultValue?: string }) {
    const [v, setV] = useState(normVin(defaultValue ?? ''))
    return (
        <div className="col-span-2">
            <label className="label" htmlFor="vin">VIN <span className="font-normal text-muted/70">{v.length}/17</span></label>
            <input id="vin" name="vin" value={v} onChange={(e) => setV(normVin(e.target.value))} placeholder="WDC1641861A123456"
                autoCapitalize="characters" autoCorrect="off" spellCheck={false} className="input font-mono uppercase tracking-wider" />
        </div>
    )
}
