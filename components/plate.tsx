// Номер в стиле российского знака: белая плашка, чёрный текст.
export function PlateBadge({ plate, big = false }: { plate: string; big?: boolean }) {
    return (
        <span className={`inline-flex shrink-0 items-center rounded-md border-2 border-black bg-white font-mono font-black uppercase tracking-wider text-black ${big ? 'px-3 py-1 text-2xl' : 'px-2 py-0.5 text-sm'}`}>
            {plate || '—'}
        </span>
    )
}
