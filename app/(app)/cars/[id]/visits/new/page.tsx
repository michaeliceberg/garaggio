import { notFound } from 'next/navigation'
import { getCar, getVisits } from '@/lib/data'
import { VisitForm } from '@/components/visit-form'
import { VisitHeader } from '@/components/visit-header'

export default async function NewVisit({ params }: { params: { id: string } }) {
    const car = await getCar(Number(params.id))
    if (!car) notFound()
    const [last] = await getVisits(car.id)
    return (
        <>
            <VisitHeader car={car} title="Новый визит" />
            <VisitForm carId={car.id} powertrain={car.powertrain} lastMileage={last?.mileage} />
        </>
    )
}
