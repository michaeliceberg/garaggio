import { CarForm } from '@/components/car-form'

export default function NewCar({ searchParams }: { searchParams: { plate?: string; name?: string; phone?: string; appt?: string } }) {
    return (
        <>
            <h1 className="text-2xl font-black">Новая машина</h1>
            <CarForm plate={searchParams.plate} owner={{ name: searchParams.name, phone: searchParams.phone }} appt={Number(searchParams.appt) || undefined} />
        </>
    )
}
