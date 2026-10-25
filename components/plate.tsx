import { normPlate } from '@/lib/format'

// Номер как настоящий российский знак: белая плашка, толстая чёрная скруглённая рамка,
// слева «Р 799 ХК» (буквы мельче цифр), справа за чертой — регион, под ним «RUS» и триколор.
// Шрифт узкий «номерной» (.font-plate). Нестандартный номер (иностранный, мото) — просто текстом в той же рамке.
const RU = /^([АВЕКМНОРСТУХ])(\d{3})([АВЕКМНОРСТУХ]{2})(\d{2,3})$/

export function PlateBadge({ plate, big = false }: { plate: string; big?: boolean }) {
    const m = RU.exec(normPlate(plate || ''))
    const size = big ? 'text-[34px] border-[3px] rounded-[7px]' : 'text-[19px] border-2 rounded-[5px]'
    if (!m) {
        return (
            <span className={`font-plate inline-flex shrink-0 items-center whitespace-nowrap border-black bg-white px-[0.3em] py-[0.08em] uppercase leading-none tracking-wide text-black ${size}`}>
                {plate || '—'}
            </span>
        )
    }
    const [, l1, digits, l2, region] = m
    return (
        <span className={`font-plate inline-flex shrink-0 items-stretch overflow-hidden whitespace-nowrap border-black bg-white leading-none text-black ${size}`}
            aria-label={`Номер ${l1} ${digits} ${l2} ${region}`}>
            <span className="flex items-baseline gap-[0.1em] px-[0.28em] pb-[0.06em] pt-[0.1em]">
                <span className="text-[0.8em]">{l1}</span>
                <span className="tracking-[0.02em]">{digits}</span>
                <span className="text-[0.8em] tracking-[0.04em]">{l2}</span>
            </span>
            <span className="w-[0.07em] min-w-[2px] self-stretch bg-black" />
            <span className="flex flex-col items-center justify-center px-[0.2em]">
                <span className="text-[0.62em] leading-[0.95]">{region}</span>
                <span className="mt-[0.06em] flex items-center gap-[0.12em] text-[0.26em] leading-none">
                    RUS
                    <span className="inline-flex h-[0.95em] w-[1.45em] flex-col overflow-hidden border-[0.5px] border-black/40" aria-hidden>
                        <span className="flex-1 bg-white" /><span className="flex-1 bg-[#0039A6]" /><span className="flex-1 bg-[#D52B1E]" />
                    </span>
                </span>
            </span>
        </span>
    )
}
