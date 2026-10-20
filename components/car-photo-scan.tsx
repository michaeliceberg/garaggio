'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { compressPhoto } from '@/lib/photo-client'

// Кнопка «Сфоткай номер или СТС» в карточке машины: нейросеть читает фото и заполняет пустые поля.
export function CarPhotoScan() {
    const ref = useRef<HTMLInputElement>(null)
    const [state, setState] = useState<'idle' | 'busy' | 'done' | 'err'>('idle')
    const [msg, setMsg] = useState('')
    const onFile = async (file?: File) => {
        if (!file) return
        setState('busy'); setMsg('')
        try {
            const fd = new FormData()
            fd.append('photo', await compressPhoto(file))
            const res = await fetch('/api/recognize-car', { method: 'POST', body: fd })
            if (!res.ok) throw new Error(String(res.status))
            const car = await res.json()
            const filled: string[] = []
            const set = (id: string, v: unknown, label: string) => {
                const el = document.getElementById(id) as HTMLInputElement | null
                if (!el || v == null || v === '' || el.value.trim()) return
                el.value = String(v); filled.push(label)
            }
            set('year', car.year, 'год')
            // марка, модель и цвет — управляемые поля, им шлём событие
            for (const [field, label] of [['plate', 'номер'], ['brand', 'марка'], ['model', 'модель'], ['color', 'цвет']] as const) {
                const el = document.getElementById(field) as HTMLInputElement | null
                if (car[field] && el && !el.value.trim()) { window.dispatchEvent(new CustomEvent('garaggio:fill', { detail: { field, value: car[field] } })); filled.push(label) }
            }
            const vinEl = document.getElementById('vin') as HTMLInputElement | null
            if (car.vin && vinEl && !vinEl.value) { window.dispatchEvent(new CustomEvent('garaggio:vin', { detail: car.vin })); filled.push('VIN') }
            setState('done')
            setMsg(filled.length ? `Заполнили: ${filled.join(', ')}. Проверь!` : 'Ничего нового не нашли — попробуй ближе и без бликов')
        } catch {
            setState('err'); setMsg('Не получилось распознать. Попробуй ещё раз')
        } finally {
            if (ref.current) ref.current.value = ''
        }
    }
    return (
        <div className="flex flex-col gap-2">
            <button type="button" onClick={() => ref.current?.click()} disabled={state === 'busy'}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gold/50 bg-gold/[0.07] p-3 font-bold text-gold disabled:opacity-60">
                {state === 'busy' ? <><Loader2 size={20} className="animate-spin" />Читаю фото…</> : <><Camera size={24} className="shrink-0" /><span className="flex flex-col text-left leading-tight"><span>Сфоткай номер или СТС</span><span className="text-sm font-semibold text-gold/75">заполню сам</span></span></>}
            </button>
            <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            {msg && <p className={`text-center text-sm ${state === 'err' ? 'text-tomato' : 'text-muted'}`}>{msg}</p>}
        </div>
    )
}
