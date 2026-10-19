'use client'

import { useState } from 'react'
import { formatPhone } from '@/lib/format'

// Телефон: при фокусе сразу «+7 », цифры группируются «+7 916 099 19 97».
export function PhoneInput({ defaultValue }: { defaultValue?: string }) {
    const [v, setV] = useState(formatPhone(defaultValue ?? ''))
    return (
        <div>
            <label className="label" htmlFor="owner_phone">Телефон</label>
            <input id="owner_phone" name="owner_phone" type="tel" inputMode="tel" autoComplete="tel" value={v}
                onFocus={() => { if (!v) setV('+7 ') }}
                onBlur={() => { if (v.replace(/\D/g, '') === '7') setV('') }}
                onChange={(e) => {
                    const raw = e.target.value
                    // стирание пробела/плюса не должно «застревать»: если цифр стало меньше или столько же — просто форматируем
                    setV(raw.trim() === '+' || raw.trim() === '' ? '' : formatPhone(raw))
                }}
                placeholder="+7 916 099 19 97" className="input tracking-wide" />
        </div>
    )
}
