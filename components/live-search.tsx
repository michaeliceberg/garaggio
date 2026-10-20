'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

// Поиск на главной: список фильтруется сразу по мере ввода (без Enter) — адрес обновляется ?q=…
export function LiveSearch({ initial }: { initial: string }) {
    const router = useRouter()
    const [q, setQ] = useState(initial)
    const first = useRef(true)
    useEffect(() => {
        if (first.current) { first.current = false; return }
        const t = setTimeout(() => router.replace(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/', { scroll: false }), 250)
        return () => clearTimeout(t)
    }, [q, router])
    return (
        <form className="relative" onSubmit={(e) => { e.preventDefault(); (document.activeElement as HTMLElement | null)?.blur() }}>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={20} />
            <input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Номер, имя, телефон или марка" enterKeyHint="search"
                className="input pl-10 pr-10 text-lg uppercase placeholder:normal-case" autoComplete="off" />
            {q && (
                <button type="button" onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-label="Очистить"><X size={20} /></button>
            )}
        </form>
    )
}
