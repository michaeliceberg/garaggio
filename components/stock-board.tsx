'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Mic, Square, Loader2, Plus, PackagePlus, ClipboardCheck, Pencil, Trash2, Droplet, Filter } from 'lucide-react'
import { deleteStockItem, parseStockVoice, saveStockItems, stockMove, updateStockItem, type NewStockItem } from '@/app/actions'
import { FILTER_TYPES, OIL_SPECS, fmtQty, isLow, itemLabel, qtyText, unitOf, type StockItem, type StockKind } from '@/lib/stock-match'

type Move = { id: number; item_id: number; delta: number; reason: string; visit_id: number | null; created_at: string; plate: string | null }
const REASON: Record<string, string> = { in: 'Пришло', count: 'Пересчёт', visit: 'Визит', start: 'Начальный остаток' }
const dayRu = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
const num = (s: string) => Number(s.replace(',', '.').replace(/\s/g, '')) || 0
const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? 'border-gold bg-gold/15 text-gold' : 'border-line text-white/85'}`

export function StockBoard({ items, moves }: { items: StockItem[]; moves: Move[] }) {
    const [open, setOpen] = useState<number | null>(null)
    const groups: { kind: StockKind; title: string; icon: React.ReactNode }[] = [
        { kind: 'oil', title: 'Масло', icon: <Droplet size={18} /> },
        { kind: 'filter', title: 'Фильтры', icon: <Filter size={18} /> },
    ]
    return (
        <div className="flex flex-col gap-4">
            <StockVoice />
            <details className="fold">
                <summary className="fold-summary"><Plus size={18} />Добавить позицию</summary>
                <div className="fold-body"><AddItem /></div>
            </details>
            {groups.map((g) => {
                const list = items.filter((i) => i.kind === g.kind)
                if (!list.length) return null
                return (
                    <section key={g.kind} className="card flex flex-col gap-2 p-4">
                        <h2 className="flex items-center gap-2 font-black text-gold">{g.icon}{g.title}</h2>
                        {list.map((i) => (
                            <StockRow key={i.id} item={i} moves={moves.filter((m) => m.item_id === i.id)} open={open === i.id} onToggle={() => setOpen(open === i.id ? null : i.id)} />
                        ))}
                    </section>
                )
            })}
        </div>
    )
}

function StockRow({ item, moves, open, onToggle }: { item: StockItem; moves: Move[]; open: boolean; onToggle: () => void }) {
    const [pending, start] = useTransition()
    const [inVal, setInVal] = useState('')
    const [countVal, setCountVal] = useState('')
    const [edit, setEdit] = useState(false)
    const low = isLow(item)
    const unit = unitOf(item.kind)
    const quick = item.kind === 'oil' ? [1, 4, 5, 20] : [1, 2, 5, 10]
    const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); setInVal(''); setCountVal('') })
    return (
        <div className={`rounded-xl border ${open ? 'border-gold/40' : 'border-transparent'} bg-bg`}>
            <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left">
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{itemLabel(item)}</span>
                    {item.article && <span className="block truncate text-xs text-muted">{item.article}</span>}
                </span>
                <span className={`shrink-0 text-lg font-black ${low ? 'text-tomato' : 'text-olive'}`}>{qtyText(item)}</span>
            </button>
            {open && (
                <div className={`flex flex-col gap-3 px-3 pb-3 ${pending ? 'opacity-60' : ''}`}>
                    <div className="flex flex-col gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-bold"><PackagePlus size={16} />Пришло</span>
                        <div className="flex flex-wrap gap-1.5">
                            {quick.map((q) => <button key={q} type="button" disabled={pending} className={chip(false)} onClick={() => run(() => stockMove(item.id, 'in', q))}>+{q} {unit}</button>)}
                        </div>
                        <div className="flex gap-2">
                            <input inputMode="decimal" value={inVal} onChange={(e) => setInVal(e.target.value)} className="input" placeholder={`сколько, ${unit}`} />
                            <button type="button" className="btn-primary shrink-0 px-4" disabled={pending || num(inVal) <= 0} onClick={() => run(() => stockMove(item.id, 'in', num(inVal)))}>Добавить</button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-bold"><ClipboardCheck size={16} />Пересчитал — на полке на самом деле</span>
                        <div className="flex gap-2">
                            <input inputMode="decimal" value={countVal} onChange={(e) => setCountVal(e.target.value)} className="input" placeholder={`${fmtQty(item.qty)} ${unit}`} />
                            <button type="button" className="btn-ghost shrink-0 px-4" disabled={pending || countVal.trim() === ''} onClick={() => run(() => stockMove(item.id, 'count', num(countVal)))}>Сохранить</button>
                        </div>
                    </div>
                    {moves.length > 0 && (
                        <div className="flex flex-col gap-1 text-sm">
                            <span className="font-bold">История</span>
                            {moves.slice(0, 8).map((m) => (
                                <div key={m.id} className="flex justify-between gap-2 text-muted">
                                    <span>{dayRu(m.created_at)} · {m.reason === 'visit' && m.visit_id ? <Link href={`/visits/${m.visit_id}`} className="text-gold">визит {m.plate ?? ''}</Link> : REASON[m.reason] ?? m.reason}</span>
                                    <b className={m.delta < 0 ? 'text-tomato' : 'text-olive'}>{m.delta > 0 ? '+' : '−'}{fmtQty(Math.abs(m.delta))} {unit}</b>
                                </div>
                            ))}
                        </div>
                    )}
                    {edit ? <EditItem item={item} onDone={() => setEdit(false)} /> : (
                        <div className="flex items-center justify-between text-sm">
                            <button type="button" className="flex items-center gap-1 font-semibold text-muted" onClick={() => setEdit(true)}><Pencil size={14} />Изменить · «мало», когда ≤ {fmtQty(item.min_qty)} {unit}</button>
                            <button type="button" className="flex items-center gap-1 font-semibold text-tomato" disabled={pending}
                                onClick={() => { if (confirm(`Убрать «${itemLabel(item)}» со склада?`)) run(() => deleteStockItem(item.id)) }}><Trash2 size={14} />Убрать</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function SpecChips({ kind, value, onChange }: { kind: StockKind; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {(kind === 'oil' ? OIL_SPECS : FILTER_TYPES).map((s) => <button key={s} type="button" className={chip(value === s)} onClick={() => onChange(value === s ? '' : s)}>{s}</button>)}
        </div>
    )
}

function AddItem() {
    const [kind, setKind] = useState<StockKind>('oil')
    const [spec, setSpec] = useState('')
    const [name, setName] = useState('')
    const [article, setArticle] = useState('')
    const [qty, setQty] = useState('')
    const [pending, start] = useTransition()
    const save = () => start(async () => {
        await saveStockItems([{ kind, name, spec, article, qty: num(qty) }])
        setName(''); setArticle(''); setQty(''); setSpec('')
    })
    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
                {(['oil', 'filter'] as StockKind[]).map((k) => (
                    <button key={k} type="button" onClick={() => { setKind(k); setSpec('') }} className={`rounded-xl border p-2.5 font-bold ${kind === k ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'}`}>{k === 'oil' ? 'Масло' : 'Фильтр'}</button>
                ))}
            </div>
            <div><label className="label">{kind === 'oil' ? 'Вязкость' : 'Какой фильтр'}</label><SpecChips kind={kind} value={spec} onChange={setSpec} /></div>
            <div>
                <label className="label">{kind === 'oil' ? 'Марка' : 'Модель фильтра'}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder={kind === 'oil' ? 'Shell Helix Ultra' : 'Mann W 712/75'} />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div><label className="label">Артикул</label><input value={article} onChange={(e) => setArticle(e.target.value)} className="input" placeholder="необязательно" /></div>
                <div><label className="label">Есть сейчас, {unitOf(kind)}</label><input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} className="input" placeholder="0" /></div>
            </div>
            <button type="button" className="btn-primary" disabled={pending || (!name.trim() && !spec)} onClick={save}>{pending ? 'Сохраняем…' : 'Добавить на склад'}</button>
        </div>
    )
}

function EditItem({ item, onDone }: { item: StockItem; onDone: () => void }) {
    const [spec, setSpec] = useState(item.spec)
    const [name, setName] = useState(item.name)
    const [article, setArticle] = useState(item.article)
    const [min, setMin] = useState(fmtQty(item.min_qty))
    const [pending, start] = useTransition()
    return (
        <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <SpecChips kind={item.kind} value={spec} onChange={setSpec} />
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder={item.kind === 'oil' ? 'Марка' : 'Модель фильтра'} />
            <div className="grid grid-cols-2 gap-2">
                <input value={article} onChange={(e) => setArticle(e.target.value)} className="input" placeholder="Артикул" />
                <div className="flex items-center gap-2"><span className="shrink-0 text-sm text-muted">мало ≤</span><input inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} className="input" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn-ghost" onClick={onDone}>Отмена</button>
                <button type="button" className="btn-primary" disabled={pending} onClick={() => start(async () => { await updateStockItem(item.id, { kind: item.kind, name, spec, article, min_qty: num(min) }); onDone() })}>Сохранить</button>
            </div>
        </div>
    )
}

// «Надиктовать остатки»: речь распознаёт телефон, нейросеть раскладывает по позициям, мастер проверяет и сохраняет.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = any
function StockVoice() {
    const [supported, setSupported] = useState(true)
    const [state, setState] = useState<'idle' | 'listening' | 'thinking'>('idle')
    const [live, setLive] = useState('')
    const [hint, setHint] = useState<string | null>(null)
    const [list, setList] = useState<(NewStockItem & { on: boolean; qs?: string })[]>([])
    const [pending, start] = useTransition()
    const rec = useRef<Rec>(null)
    const finalText = useRef('')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useEffect(() => { const w = window as any; if (!(w.SpeechRecognition || w.webkitSpeechRecognition)) setSupported(false) }, [])

    const begin = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const w = window as any
        const SR = w.SpeechRecognition || w.webkitSpeechRecognition
        if (!SR) { setSupported(false); return }
        const r: Rec = new SR()
        r.lang = 'ru-RU'; r.continuous = true; r.interimResults = true
        finalText.current = ''
        r.onresult = (e: Rec) => {
            let interim = ''
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript
                if (e.results[i].isFinal) finalText.current += t + ' '; else interim += t
            }
            setLive((finalText.current + interim).trim())
        }
        r.onerror = (e: Rec) => { setHint(e.error === 'not-allowed' ? 'Разрешите доступ к микрофону в настройках браузера' : 'Не расслышал — попробуйте ещё раз'); setState('idle') }
        r.onend = () => { if (rec.current === r) finish() }
        rec.current = r
        setLive(''); setHint(null); setState('listening')
        r.start()
    }
    const finish = async (typed?: string) => {
        const r = rec.current
        rec.current = null
        try { r?.stop() } catch { /* уже остановлен */ }
        const text = (typed ?? (finalText.current || live)).trim()
        if (!text) { setState('idle'); return }
        setState('thinking')
        const parsed = await parseStockVoice(text).catch(() => null)
        setState('idle'); setLive('')
        if (!parsed?.length) { setHint('Не получилось разобрать — попробуйте сказать по-другому или добавьте вручную'); return }
        setList(parsed.map((p) => ({ ...p, on: true })))
        setHint(null)
    }
    const [typed, setTyped] = useState('')
    const save = () => start(async () => {
        await saveStockItems(list.filter((i) => i.on))
        setList([]); setHint('Сохранено на склад 👌')
    })

    return (
        <section className="card flex flex-col gap-2 p-4">
            {state === 'listening' ? (
                <button type="button" onClick={() => finish()} className="btn w-full animate-pulse bg-tomato text-white"><Square size={18} />Готово — разобрать</button>
            ) : (
                <button type="button" onClick={begin} disabled={state === 'thinking' || !supported} className="btn w-full border border-tomato/50 bg-tomato/10 text-tomato">
                    {state === 'thinking' ? <><Loader2 size={18} className="animate-spin" />Раскладываю по полкам…</> : <><Mic size={18} />Надиктовать остатки</>}
                </button>
            )}
            {state === 'listening' && <p className="min-h-[2.5rem] rounded-xl bg-bg p-3 text-sm">{live || 'Говорите: «Шелл пять-тридцать, три канистры по четыре литра. Фильтр Манн семьсот двенадцать дробь семьдесят пять, три штуки»…'}</p>}
            {state === 'idle' && list.length === 0 && (
                <div className="flex gap-2">
                    <input value={typed} onChange={(e) => setTyped(e.target.value)} className="input" placeholder={supported ? '…или напишите текстом' : 'Напишите, что на полке'} />
                    <button type="button" className="btn-ghost shrink-0 px-4" disabled={!typed.trim()} onClick={() => { finish(typed); setTyped('') }}>Разобрать</button>
                </div>
            )}
            {hint && state === 'idle' && <p className="text-sm font-semibold text-olive">{hint}</p>}
            {list.length > 0 && (
                <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted">Проверьте. Если позиция уже есть на складе — её остаток заменится на этот.</p>
                    {list.map((i, k) => (
                        <div key={k} className={`flex items-center gap-2 rounded-xl bg-bg p-2 ${i.on ? '' : 'opacity-50'}`}>
                            <input type="checkbox" checked={i.on} onChange={(e) => setList(list.map((x, j) => (j === k ? { ...x, on: e.target.checked } : x)))} className="h-6 w-6 shrink-0 accent-olive" />
                            <span className="min-w-0 flex-1 text-sm"><b>{itemLabel({ kind: i.kind as StockKind, name: i.name, spec: i.spec })}</b>{i.article && <span className="block text-xs text-muted">{i.article}</span>}</span>
                            <input inputMode="decimal" value={i.qs ?? String(i.qty).replace('.', ',')} onChange={(e) => setList(list.map((x, j) => (j === k ? { ...x, qs: e.target.value, qty: num(e.target.value) } : x)))} className="input w-20 py-2 text-right" />
                            <span className="w-6 text-sm text-muted">{unitOf(i.kind as StockKind)}</span>
                        </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" className="btn-ghost" onClick={() => setList([])}>Отмена</button>
                        <button type="button" className="btn-primary" disabled={pending || !list.some((i) => i.on)} onClick={save}>{pending ? 'Сохраняем…' : 'Сохранить'}</button>
                    </div>
                </div>
            )}
        </section>
    )
}
