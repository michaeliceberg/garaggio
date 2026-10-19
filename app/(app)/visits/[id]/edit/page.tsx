import { notFound } from 'next/navigation'
import { getCar, getVisit } from '@/lib/data'
import { VisitForm } from '@/components/visit-form'
import { VisitHeader } from '@/components/visit-header'

export default async function EditVisit({ params }: { params: { id: string } }) {
    const visit = await getVisit(Number(params.id))
    if (!visit) notFound()
    const car = await getCar(visit.car_id)
    return (
        <>
            {car ? <VisitHeader car={car} title="Редактировать визит" /> : <h1 className="text-xl font-black">Редактировать визит</h1>}
            <VisitForm carId={visit.car_id} powertrain={car?.powertrain ?? 'ice'} visit={visit} />
        </>
    )
}
