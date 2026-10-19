import { notFound } from 'next/navigation'
import { getCar, getKnownParts, getVisits } from '@/lib/data'
import { VisitForm } from '@/components/visit-form'
import { VisitHeader } from '@/components/visit-header'

export default async function NewVisit({ params }: { params: { id: string } }) {
    const car = await getCar(Number(params.id))
    if (!car) notFound()
    const [[last], known] = await Promise.all([getVisits(car.id), getKnownParts(car.id)])
    return (
        <>
            <VisitHeader car={car} title="Новый визит" />
            <VisitForm carId={car.id} powertrain={car.powertrain} lastMileage={last?.mileage} known={known} />
        </>
    )
}
