import { saveCar } from '@/app/actions'
import type { Car } from '@/lib/data'
import { VinInput } from './vin-input'
import { PhoneInput } from './phone-input'
import { CarPhotoScan } from './car-photo-scan'
import { BrandInput } from './brand-input'
import { ColorPicker } from './color-picker'
import { Section } from './form-section'
import { Car as CarIcon, User, MessageSquare } from 'lucide-react'

const Field = ({ name, label, value, placeholder, type = 'text', inputMode, className = '' }: {
    name: string; label: string; value?: string | number | null; placeholder?: string; type?: string; inputMode?: 'numeric' | 'tel' | 'text'; className?: string
}) => (
    <div className={className}>
        <label className="label" htmlFor={name}>{label}</label>
        <input id={name} name={name} type={type} inputMode={inputMode} defaultValue={value ?? ''} placeholder={placeholder} className="input" />
    </div>
)

// owner/appt — машину заводят из записи в календаре: имя и телефон уже известны, запись потом привяжется к машине
export function CarForm({ car, plate, owner, appt }: { car?: Car; plate?: string; owner?: { name?: string; phone?: string }; appt?: number }) {
    return (
        <form action={saveCar} className="flex flex-col gap-3">
            {car && <input type="hidden" name="id" value={car.id} />}
            {appt && <input type="hidden" name="appt" value={appt} />}
            <Section icon={<CarIcon size={18} />} title="Машина" color="#F2C35B">
            <CarPhotoScan />
            <div className="grid grid-cols-2 gap-3">
                <Field name="plate" label="Госномер" value={car?.plate ?? plate} placeholder="А123ВС77" className="col-span-2" />
                <BrandInput defaultValue={car?.brand} />
                <Field name="model" label="Модель" value={car?.model} placeholder="ML500" />
                <Field name="year" label="Год" value={car?.year} inputMode="numeric" placeholder="2008" />
                
                <div>
                    <label className="label" htmlFor="powertrain">Тип</label>
                    <select id="powertrain" name="powertrain" defaultValue={car?.powertrain ?? ''} className="input">
                        {!car && <option value="">По марке</option>}
                        <option value="ice">ДВС</option>
                        <option value="hybrid">Гибрид</option>
                        <option value="ev">Электро</option>
                    </select>
                </div>
                <ColorPicker defaultValue={car?.color} />
                <VinInput defaultValue={car?.vin} />
            </div>
            </Section>
            <Section icon={<User size={18} />} title="Владелец" color="#53ADEF">
            <div className="grid grid-cols-2 gap-3">
                <Field name="owner_name" label="Имя" value={car?.owner_name ?? owner?.name} placeholder="Имя" />
                <PhoneInput defaultValue={car?.owner_phone ?? owner?.phone} />
            </div>
            </Section>
            <Section icon={<MessageSquare size={18} />} title="Заметки о машине" color="#9AA7B0">
            <div>
                <textarea id="notes" name="notes" aria-label="Заметки о машине" defaultValue={car?.notes} rows={3} className="input" placeholder="Нестандартный болт, клиент просит только оригинал…" />
            </div>
            </Section>
            <button className="btn-primary">{car ? 'Сохранить' : 'Добавить машину'}</button>
        </form>
    )
}
