import { notFound } from 'next/navigation'
import { getCar, getVisits } from '@/lib/data'
import { VisitForm } from '@/components/visit-form'
import { PlateBadge } from '@/components/plate'

export default async function NewVisit({ params }: { params: { id: string } }) {
    const car = await getCar(Number(params.id))
    if (!car) notFound()
    const [last] = await getVisits(car.id)
    return (
        <>
            <div className="flex items-center gap-3">
                <PlateBadge plate={car.plate} />
                <h1 className="text-xl font-black">Новый визит</h1>
            </div>
            <VisitForm carId={car.id} lastMileage={last?.mileage} />
        </>
    )
}
