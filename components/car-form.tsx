import { saveCar } from '@/app/actions'
import type { Car } from '@/lib/data'
import { VinInput } from './vin-input'
import { PhoneInput } from './phone-input'
import { CarPhotoScan } from './car-photo-scan'
import { BrandInput } from './brand-input'
import { ColorPicker } from './color-picker'

const Field = ({ name, label, value, placeholder, type = 'text', inputMode, className = '' }: {
    name: string; label: string; value?: string | number | null; placeholder?: string; type?: string; inputMode?: 'numeric' | 'tel' | 'text'; className?: string
}) => (
    <div className={className}>
        <label className="label" htmlFor={name}>{label}</label>
        <input id={name} name={name} type={type} inputMode={inputMode} defaultValue={value ?? ''} placeholder={placeholder} className="input" />
    </div>
)

export function CarForm({ car, plate }: { car?: Car; plate?: string }) {
    return (
        <form action={saveCar} className="card flex flex-col gap-4 p-4">
            {car && <input type="hidden" name="id" value={car.id} />}
            <CarPhotoScan />
            <div className="grid grid-cols-2 gap-3">
                <Field name="plate" label="Госномер" value={car?.plate ?? plate} placeholder="А123ВС77" className="col-span-2" />
                <BrandInput defaultValue={car?.brand} />
                <Field name="model" label="Модель" value={car?.model} placeholder="ML500" />
                <Field name="year" label="Год" value={car?.year} inputMode="numeric" placeholder="2008" />
                
                <div>
                    <label className="label" htmlFor="powertrain">Тип</label>
                    <select id="powertrain" name="powertrain" defaultValue={car?.powertrain ?? ''} className="input">
                        {!car && <option value="">Авто по марке</option>}
                        <option value="ice">ДВС</option>
                        <option value="hybrid">Гибрид</option>
                        <option value="ev">Электро</option>
                    </select>
                </div>
                <ColorPicker defaultValue={car?.color} />
                <VinInput defaultValue={car?.vin} />
            </div>
            <div className="h-px bg-line" />
            <div className="grid grid-cols-2 gap-3">
                <Field name="owner_name" label="Владелец" value={car?.owner_name} placeholder="Имя" />
                <PhoneInput defaultValue={car?.owner_phone} />
            </div>
            <div>
                <label className="label" htmlFor="notes">Заметки о машине</label>
                <textarea id="notes" name="notes" defaultValue={car?.notes} rows={3} className="input" placeholder="Нестандартный болт, клиент просит только оригинал…" />
            </div>
            <button className="btn-primary">{car ? 'Сохранить' : 'Добавить машину'}</button>
        </form>
    )
}
