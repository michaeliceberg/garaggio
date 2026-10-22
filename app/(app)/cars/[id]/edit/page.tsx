import { notFound } from 'next/navigation'
import { getCar } from '@/lib/data'
import { CarForm } from '@/components/car-form'
import { deleteCar } from '@/app/actions'
import { PasswordDelete } from '@/components/password-delete'

export default async function EditCar({ params }: { params: { id: string } }) {
    const car = await getCar(Number(params.id))
    if (!car) notFound()
    return (
        <>
            <h1 className="text-2xl font-black">Редактировать машину</h1>
            <CarForm car={car} />
            <PasswordDelete action={deleteCar} fields={{ id: car.id }} label="Удалить машину" warning="Машина удалится со всеми визитами и фото. Это нельзя отменить." />
        </>
    )
}
