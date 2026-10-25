'use client'

import { useState, useTransition } from 'react'
import { ShoppingCart, Wrench, Trash2, Plus, Check } from 'lucide-react'
import { addTodo, clearDoneTodos, deleteTodo, toggleTodo } from '@/app/actions'

export type Todo = { id: number; text: string; kind: 'buy' | 'do'; done: boolean }
const KINDS = { buy: { label: 'Купить', icon: ShoppingCart, color: '#F2C35B' }, do: { label: 'Сделать', icon: Wrench, color: '#53ADEF' } } as const

// Список гаража: сверху добавить (Купить / Сделать), ниже две группы, выполненное — внизу зачёркнутым.
export function TodoList({ todos }: { todos: Todo[] }) {
    const [text, setText] = useState('')
    const [kind, setKind] = useState<'buy' | 'do'>('buy')
    const [pending, start] = useTransition()
    const add = () => { const t = text.trim(); if (!t) return; setText(''); start(() => addTodo(t, kind)) }
    const open = todos.filter((t) => !t.done), done = todos.filter((t) => t.done)

    return (
        <>
            <section className="card flex flex-col gap-3 p-4">
                <div className="grid grid-cols-2 gap-2">
                    {(['buy', 'do'] as const).map((k) => {
                        const K = KINDS[k]
                        return (
                            <button key={k} type="button" onClick={() => setKind(k)}
                                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-sm font-bold ${kind === k ? 'border-transparent text-bg' : 'border-line text-muted'}`}
                                style={kind === k ? { background: K.color } : undefined}>
                                <K.icon size={18} />{K.label}
                            </button>
                        )
                    })}
                </div>
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add() }}>
                    <input value={text} onChange={(e) => setText(e.target.value)} className="input flex-1"
                        placeholder={kind === 'buy' ? 'Перчатки. Очиститель тормозов. Ветошь' : 'Починить подъёмник. Поменять лампу'} />
                    <button className="btn-primary px-4" disabled={pending || !text.trim()} aria-label="Добавить"><Plus size={22} /></button>
                </form>
                <p className="text-xs text-muted">Можно сразу несколько — через точку: «Перчатки. Ветошь. WD-40».</p>
            </section>

            {(['buy', 'do'] as const).map((k) => {
                const items = open.filter((t) => t.kind === k)
                if (!items.length) return null
                const K = KINDS[k]
                return (
                    <section key={k} className="card flex flex-col gap-1 p-3" style={{ boxShadow: `inset 4px 0 0 ${K.color}` }}>
                        <div className="flex items-center gap-2 px-1 pb-1 font-black" style={{ color: K.color }}><K.icon size={18} />{K.label} · {items.length}</div>
                        {items.map((t) => <Row key={t.id} t={t} />)}
                    </section>
                )
            })}
            {open.length === 0 && <p className="card p-6 text-center text-muted">Всё куплено и сделано — пиздати фантастико! 🤌</p>}

            {done.length > 0 && (
                <section className="flex flex-col gap-1">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-bold text-muted">Готово · {done.length}</span>
                        <button type="button" onClick={() => start(() => clearDoneTodos())} className="text-sm text-muted underline">Убрать</button>
                    </div>
                    {done.map((t) => <Row key={t.id} t={t} />)}
                </section>
            )}
        </>
    )
}

function Row({ t }: { t: Todo }) {
    const [pending, start] = useTransition()
    return (
        <div className={`flex items-center gap-3 rounded-xl px-2 py-2 ${pending ? 'opacity-50' : ''}`}>
            <button type="button" onClick={() => start(() => toggleTodo(t.id))} aria-label={t.done ? 'Вернуть' : 'Готово'}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 ${t.done ? 'border-olive bg-olive text-bg' : 'border-line'}`}>
                {t.done && <Check size={18} strokeWidth={3} />}
            </button>
            <span className={`flex-1 ${t.done ? 'text-muted line-through' : ''}`}>{t.text}</span>
            <button type="button" onClick={() => start(() => deleteTodo(t.id))} aria-label="Удалить" className="p-1 text-muted/60"><Trash2 size={18} /></button>
        </div>
    )
}
