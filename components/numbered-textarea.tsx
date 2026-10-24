'use client'

import { useState } from 'react'
import { cleanItems, numberedText, splitItems } from '@/lib/items'

// Поле со списком пунктов: показывает «1. … 2. …», Enter начинает следующий номер,
// а «Замена масла. Приводной ремень» при выходе из поля само разбивается на пункты.
// Наружу отдаёт чистый текст (пункт на строку, без номеров).
export function NumberedTextarea({ value, onChange, rows = 3, placeholder, className = 'input' }: {
    value: string; onChange: (clean: string) => void; rows?: number; placeholder?: string; className?: string
}) {
    const [draft, setDraft] = useState<string | null>(null) // пока поле в фокусе — показываем то, что набирают
    const shown = draft ?? numberedText(value)
    const change = (t: string) => { setDraft(t); onChange(cleanItems(t)) }
    return (
        <textarea value={shown} rows={Math.max(rows, splitItems(value).length + 1)} placeholder={placeholder} className={className}
            onFocus={() => setDraft(numberedText(value))}
            onBlur={() => { const c = cleanItems(draft ?? ''); setDraft(null); onChange(c) }}
            onChange={(e) => change(e.target.value)}
            onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.shiftKey) return
                // Enter — следующий пункт с номером (первый пункт тоже получает «1.»)
                e.preventDefault()
                const el = e.currentTarget
                const before = el.value.slice(0, el.selectionStart), after = el.value.slice(el.selectionEnd)
                const items = splitItems(before)
                if (items.length === 0) { change(`1. ${after}`); requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = 3 }); return }
                // всё, что выше курсора, сразу становится нумерованным списком, и начинается следующий номер
                const next = `${items.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n${items.length + 1}. `
                change(next + after)
                requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = next.length })
            }} />
    )
}
