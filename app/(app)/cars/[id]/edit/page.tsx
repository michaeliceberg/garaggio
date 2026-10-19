import { notFound } from 'next/navigation'
import { getCar } from '@/lib/data'
import { CarForm } from '@/components/car-form'
import { deleteCar } from '@/app/actions'
import { ConfirmButton } from '@/components/confirm-button'

export default async function EditCar({ params }: { params: { id: string } }) {
    const car = await getCar(Number(params.id))
    if (!car) notFound()
    return (
        <>
            <h1 className="text-2xl font-black">Редактировать машину</h1>
            <CarForm car={car} />
            <form action={deleteCar}>
                <input type="hidden" name="id" value={car.id} />
                <ConfirmButton className="btn-danger w-full" message="Удалить машину со всеми визитами и фото? Это нельзя отменить.">Удалить машину</ConfirmButton>
            </form>
        </>
    )
}
