import { splitItems } from '@/lib/items'

// Показ работ / заметок / рекомендаций: два пункта и больше — нумерованным списком, один — просто текстом.
export function NumberedText({ text, className = '' }: { text: string; className?: string }) {
    const items = splitItems(text)
    if (items.length === 0) return null
    if (items.length === 1) return <p className={`whitespace-pre-wrap ${className}`}>{items[0]}</p>
    return (
        <ol className={`flex flex-col gap-0.5 ${className}`}>
            {items.map((t, i) => (
                <li key={i} className="flex gap-1.5"><span className="shrink-0 font-bold tabular-nums opacity-70">{i + 1}.</span><span>{t}</span></li>
            ))}
        </ol>
    )
}
