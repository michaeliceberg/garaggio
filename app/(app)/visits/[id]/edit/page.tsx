import { notFound } from 'next/navigation'
import { getVisit } from '@/lib/data'
import { VisitForm } from '@/components/visit-form'

export default async function EditVisit({ params }: { params: { id: string } }) {
    const visit = await getVisit(Number(params.id))
    if (!visit) notFound()
    return (
        <>
            <h1 className="text-xl font-black">Редактировать визит</h1>
            <VisitForm carId={visit.car_id} visit={visit} />
        </>
    )
}
