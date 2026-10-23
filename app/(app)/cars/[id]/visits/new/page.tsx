import { notFound } from 'next/navigation'
import { getCar, getKnownParts, getVisits, getWishes } from '@/lib/data'
import { getStock } from '@/lib/stock'
import { VisitForm } from '@/components/visit-form'
import { VisitHeader } from '@/components/visit-header'
import { getAppt } from '@/lib/appts'

export default async function NewVisit({ params, searchParams }: { params: { id: string }; searchParams: { appt?: string } }) {
    const car = await getCar(Number(params.id))
    if (!car) notFound()
    const [[last], known, appt, wishes, stock] = await Promise.all([getVisits(car.id), getKnownParts(car.id), searchParams.appt ? getAppt(Number(searchParams.appt)) : null, getWishes(car.id, true), getStock()])
    const fromAppt = appt?.car_id === car.id && appt.status === 'planned' ? appt : null // визит начат из записи — подставим, что собирались делать
    return (
        <>
            <VisitHeader car={car} title="Новый визит" wishes={wishes} prev={last ? { date: last.visit_date, text: last.recommendations, declined: last.declined } : null} />
            <VisitForm carId={car.id} powertrain={car.powertrain} lastMileage={last?.mileage} known={known} apptId={fromAppt?.id} initialWorks={fromAppt?.work} stock={stock} oilSpec={car.oil_spec} oilVolume={car.oil_volume} />
        </>
    )
}
