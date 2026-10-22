'use client'

import { useState } from 'react'
import { OIL_METHOD_LABEL } from '@/lib/format'

const VISC = ['0W-20', '0W-30', '5W-30', '5W-40', '10W-40']

// «Масло двигателя» в карточке машины: вязкость кнопками (можно несколько) или руками, объём, слив/откачка, примечание.
export function OilFields({ spec, volume, method, note }: { spec?: string; volume?: string; method?: string; note?: string }) {
    const [s, setS] = useState(spec ?? '')
    const [m, setM] = useState(method ?? '')
    const list = s.split(',').map((x) => x.trim()).filter(Boolean)
    const toggle = (v: string) => setS((list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(', '))
    const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted'}`
    return (
        <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
                <label className="label" htmlFor="oil_spec">Вязкость</label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {VISC.map((v) => <button key={v} type="button" className={chip(list.includes(v))} onClick={() => toggle(v)}>{v}</button>)}
                </div>
                <input id="oil_spec" name="oil_spec" value={s} onChange={(e) => setS(e.target.value)} className="input" placeholder="5W-30, 5W-40" />
            </div>
            <div>
                <label className="label" htmlFor="oil_volume">Объём, л</label>
                <input id="oil_volume" name="oil_volume" inputMode="decimal" defaultValue={volume} className="input" placeholder="6,5" />
            </div>
            <div>
                <span className="label">Как меняем</span>
                <input type="hidden" name="oil_method" value={m} />
                <div className="flex gap-1.5">
                    {Object.entries(OIL_METHOD_LABEL).map(([k, l]) => (
                        <button key={k} type="button" className={`${chip(m === k)} flex-1 py-2.5`} onClick={() => setM(m === k ? '' : k)}>{l[0].toUpperCase() + l.slice(1)}</button>
                    ))}
                </div>
            </div>
            <div className="col-span-2">
                <label className="label" htmlFor="oil_note">Примечание</label>
                <input id="oil_note" name="oil_note" defaultValue={note} className="input" placeholder="остаток 200 г, допуск VW 504…" />
            </div>
        </div>
    )
}

