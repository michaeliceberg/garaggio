import { notFound } from 'next/navigation'
import { getCar, getKnownParts, getVisit } from '@/lib/data'
import { getStock } from '@/lib/stock'
import { VisitForm } from '@/components/visit-form'
import { VisitHeader } from '@/components/visit-header'

export default async function EditVisit({ params }: { params: { id: string } }) {
    const visit = await getVisit(Number(params.id))
    if (!visit) notFound()
    const [car, known, stock] = await Promise.all([getCar(visit.car_id), getKnownParts(visit.car_id), getStock()])
    return (
        <>
            {car ? <VisitHeader car={car} title="Редактировать визит" /> : <h1 className="text-xl font-black">Редактировать визит</h1>}
            <VisitForm carId={visit.car_id} powertrain={car?.powertrain ?? 'ice'} visit={visit} known={known} stock={stock} oilSpec={car?.oil_spec} oilVolume={car?.oil_volume} />
        </>
    )
}
