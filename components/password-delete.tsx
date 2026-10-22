'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Lock } from 'lucide-react'

type Action = (prev: string | null, f: FormData) => Promise<string | null>

// Удаление визита/машины: сначала кнопка, потом пароль мастера — чтобы не удалить случайно.
export function PasswordDelete({ action, fields, label, warning }: { action: Action; fields: Record<string, string | number>; label: string; warning: string }) {
    const [open, setOpen] = useState(false)
    const [error, formAction] = useFormState(action, null)
    if (!open) return <button type="button" className="btn-danger w-full" onClick={() => setOpen(true)}>{label}</button>
    return (
        <form action={formAction} className="card flex flex-col gap-3 border-tomato/40 p-4">
            {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <p className="text-sm">{warning}</p>
            <label className="label mb-0 flex items-center gap-1.5" htmlFor="del-password"><Lock size={14} />Пароль для подтверждения</label>
            <input id="del-password" name="password" type="password" autoComplete="current-password" autoFocus className="input" />
            {error && <p className="text-sm font-semibold text-tomato">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Отмена</button>
                <Submit label={label} />
            </div>
        </form>
    )
}
function Submit({ label }: { label: string }) {
    const { pending } = useFormStatus()
    return <button className="btn-danger" disabled={pending}>{pending ? 'Удаляем…' : label}</button>
}
