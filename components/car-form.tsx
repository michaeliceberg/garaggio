import { saveCar } from '@/app/actions'
import type { Car } from '@/lib/data'
import { VinInput } from './vin-input'

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
            <div className="grid grid-cols-2 gap-3">
                <Field name="plate" label="Госномер" value={car?.plate ?? plate} placeholder="А123ВС77" className="col-span-2" />
                <Field name="brand" label="Марка" value={car?.brand} placeholder="Mercedes" />
                <Field name="model" label="Модель" value={car?.model} placeholder="ML500" />
                <Field name="year" label="Год" value={car?.year} inputMode="numeric" placeholder="2008" />
                <Field name="color" label="Цвет" value={car?.color} placeholder="синий" />
                <VinInput defaultValue={car?.vin} />
            </div>
            <div className="h-px bg-line" />
            <div className="grid grid-cols-2 gap-3">
                <Field name="owner_name" label="Владелец" value={car?.owner_name} placeholder="Имя" />
                <Field name="owner_phone" label="Телефон" value={car?.owner_phone} type="tel" inputMode="tel" placeholder="+7…" />
            </div>
            <div>
                <label className="label" htmlFor="notes">Заметки о машине</label>
                <textarea id="notes" name="notes" defaultValue={car?.notes} rows={3} className="input" placeholder="Нестандартный болт, клиент просит только оригинал…" />
            </div>
            <button className="btn-primary">{car ? 'Сохранить' : 'Добавить машину'}</button>
        </form>
    )
}
