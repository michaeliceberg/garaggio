import { ApptForm } from '@/components/appt-form'
import { carsLite, todayMsk } from '@/lib/appts'

export const dynamic = 'force-dynamic'

export default async function NewAppt({ searchParams }: { searchParams: { d?: string; t?: string; car?: string } }) {
    const cars = await carsLite()
    const day = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.d ?? '') ? searchParams.d! : todayMsk()
    const time = /^\d{2}:\d{2}$/.test(searchParams.t ?? '') ? searchParams.t! : '10:00'
    const carId = Number(searchParams.car) || null
    return (
        <>
            <h1 className="text-2xl font-black">Новая запись</h1>
            <ApptForm cars={cars} initial={{ car_id: cars.some((c) => c.id === carId) ? carId : null, client_name: '', client_phone: '', day, start_time: time, duration_min: 60, work: '' }} />
        </>
    )
}
