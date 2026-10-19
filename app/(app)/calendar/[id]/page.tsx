import { notFound } from 'next/navigation'
import { ApptForm } from '@/components/appt-form'
import { ConfirmButton } from '@/components/confirm-button'
import { carsLite, getAppt } from '@/lib/appts'
import { deleteAppt } from '@/app/actions'

export const dynamic = 'force-dynamic'

export default async function EditAppt({ params }: { params: { id: string } }) {
    const a = await getAppt(Number(params.id))
    if (!a) notFound()
    const cars = await carsLite()
    return (
        <>
            <h1 className="text-2xl font-black">Запись</h1>
            <ApptForm cars={cars} initial={{ id: a.id, car_id: a.car_id, client_name: a.client_name, client_phone: a.client_phone, day: a.day, start_time: a.start_time, duration_min: a.duration_min, work: a.work }} />
            <form action={deleteAppt}>
                <input type="hidden" name="id" value={a.id} />
                <ConfirmButton message="Удалить запись совсем? (Отменить можно и без удаления — кнопкой «Отменить» в календаре.)" className="btn-danger w-full">Удалить запись</ConfirmButton>
            </form>
        </>
    )
}
