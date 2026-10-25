'use client'

import { useEffect, useRef, useState } from 'react'
import { Delete, Check } from 'lucide-react'

// Госномер РФ: А 123 ВС 77(7). Своя клавиатура: на месте буквы — только 12 «номерных» букв,
// на месте цифры — цифры; после ввода позиция сама переключает клавиатуру. Регион — 2 или 3 цифры.
// «Другой формат» — обычное поле (иностранный, мото, прицеп). Значение уходит в форму скрытым полем.
export const PLATE_LETTERS = ['А', 'В', 'Е', 'К', 'М', 'Н', 'О', 'Р', 'С', 'Т', 'У', 'Х']
const LAT: Record<string, string> = { A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', Y: 'У', X: 'Х' }
const RU_FULL = /^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$/
const RU_PART = /^([АВЕКМНОРСТУХ](\d{0,3}|\d{3}[АВЕКМНОРСТУХ]{0,2}|\d{3}[АВЕКМНОРСТУХ]{2}\d{0,3}))?$/
const norm = (s: string) => s.toUpperCase().replace(/[\s-]/g, '').replace(/[ABEKMHOPCTYX]/g, (c) => LAT[c] ?? c)
// что ждём на позиции: буква, цифра или ничего (номер набран)
const kindAt = (len: number): 'L' | 'D' | null => (len === 0 || len === 4 || len === 5 ? 'L' : len < 9 ? 'D' : null)
const TEMPLATE = 'А000АА000'

export function PlateInput({ name = 'plate', defaultValue = '', label = 'Госномер', autoOpen = false }: { name?: string; defaultValue?: string; label?: string; autoOpen?: boolean }) {
    const init = norm(defaultValue)
    const [v, setV] = useState(init)
    const [free, setFree] = useState(!!init && !RU_PART.test(init))
    const [open, setOpen] = useState(autoOpen)
    const box = useRef<HTMLButtonElement>(null)
    useEffect(() => {
        const on = (e: Event) => {
            const d = (e as CustomEvent).detail
            if (d?.field !== 'plate') return
            const n = norm(String(d.value)); setV(n); setFree(!RU_PART.test(n))
        }
        window.addEventListener('garaggio:fill', on)
        return () => window.removeEventListener('garaggio:fill', on)
    }, [])

    const kind = kindAt(v.length)
    const press = (ch: string) => setV((p) => {
        const k = kindAt(p.length)
        if (k === 'L' && PLATE_LETTERS.includes(ch)) return p + ch
        if (k === 'D' && /\d/.test(ch)) return p + ch
        return p
    })
    const back = () => setV((p) => p.slice(0, -1))
    const done = v.length >= 8 && RU_FULL.test(v)
    useEffect(() => { if (v.length === 9) setOpen(false) }, [v]) // трёхзначный регион — номер полный, прячем клавиатуру

    // с компьютера можно печатать с обычной клавиатуры
    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Backspace') { e.preventDefault(); back(); return }
        if (e.key === 'Enter') { e.preventDefault(); setOpen(false); return }
        const ch = norm(e.key)
        if (ch.length === 1) { e.preventDefault(); press(ch) }
    }

    if (free) {
        return (
            <div className="col-span-2">
                <label className="label" htmlFor={`${name}-free`}>{label}</label>
                <input id={`${name}-free`} name={name} value={v} onChange={(e) => setV(e.target.value.toUpperCase())} className="input font-mono uppercase" placeholder="Любой формат" autoComplete="off" />
                <button type="button" onClick={() => { setV(''); setFree(false); setOpen(true) }} className="mt-1 text-sm font-semibold text-gold">← Российский номер</button>
            </div>
        )
    }

    return (
        <div className="col-span-2">
            <span className="label">{label}</span>
            <input type="hidden" name={name} value={v} id={name} />
            {/* сам номер — как настоящий знак: белая плашка, рамка, регион справа */}
            <button ref={box} type="button" onClick={() => setOpen((o) => !o)} onKeyDown={onKey} aria-label={`${label}: ${v || 'не указан'}`}
                className={`flex w-full items-stretch overflow-hidden rounded-xl border-2 bg-white font-plate text-[30px] text-black transition ${open ? 'border-gold ring-2 ring-gold/30' : 'border-black/80'}`}>
                <span className="flex flex-1 items-center justify-center gap-[2px] px-2 py-2 tracking-wider">
                    {TEMPLATE.slice(0, 6).split('').map((t, i) => <Slot key={i} ch={v[i]} hint={t} active={open && v.length === i} gap={i === 0 || i === 3} />)}
                </span>
                <span className="flex min-w-[64px] flex-col items-center justify-center border-l-2 border-black/80 px-1.5 leading-none">
                    <span className="flex text-xl">{[6, 7, 8].map((i) => <Slot key={i} ch={v[i]} hint={i === 8 ? '' : '0'} active={open && v.length === i} />)}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[9px] font-bold tracking-wide">RUS<span className="inline-flex h-[8px] w-[12px] flex-col overflow-hidden border-[0.5px] border-black/40" aria-hidden><span className="flex-1 bg-white" /><span className="flex-1 bg-[#0039A6]" /><span className="flex-1 bg-[#D52B1E]" /></span></span>
                </span>
            </button>

            {open && (
                <div className="mt-2 rounded-xl border border-line bg-bg p-2">
                    <div className="mb-1.5 text-center text-xs font-semibold text-muted">
                        {kind === 'L' ? 'Буква' : kind === 'D' ? (v.length >= 6 ? 'Регион' : 'Цифра') : 'Номер набран'}
                    </div>
                    {kind === 'L' ? (
                        <div className="grid grid-cols-6 gap-1.5">
                            {PLATE_LETTERS.map((l) => <Key key={l} onClick={() => press(l)}>{l}</Key>)}
                        </div>
                    ) : kind === 'D' ? (
                        <div className="grid grid-cols-5 gap-1.5">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => <Key key={d} onClick={() => press(d)}>{d}</Key>)}
                        </div>
                    ) : null}
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <Key onClick={back} muted><Delete size={20} /></Key>
                        <Key onClick={() => setOpen(false)} accent={done}><Check size={20} />{done ? 'Готово' : 'Скрыть'}</Key>
                    </div>
                </div>
            )}
            <button type="button" onClick={() => { setFree(true); setOpen(false) }} className="mt-1 text-xs font-semibold text-muted">Другой формат (иностранный, мото)</button>
        </div>
    )
}

function Slot({ ch, hint, active, gap }: { ch?: string; hint: string; active: boolean; gap?: boolean }) {
    return (
        <span className={`inline-block min-w-[0.62em] text-center ${gap ? 'mr-1' : ''} ${ch ? '' : 'text-black/20'} ${active ? 'animate-pulse rounded bg-gold/40' : ''}`}>
            {ch ?? hint}
        </span>
    )
}

function Key({ children, onClick, muted, accent }: { children: React.ReactNode; onClick: () => void; muted?: boolean; accent?: boolean }) {
    return (
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick}
            className={`flex min-h-[48px] items-center justify-center gap-1 rounded-lg text-xl font-black active:scale-95 ${accent ? 'bg-basil text-white' : muted ? 'bg-card text-muted' : 'bg-card text-white'}`}>
            {children}
        </button>
    )
}
