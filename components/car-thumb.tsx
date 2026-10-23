import { Car as CarIcon } from 'lucide-react'
import { colorHex } from '@/lib/car-dicts'

export const carPhotoUrl = (c: { id: number; photo: string }) => (c.photo ? `/api/cars/${c.id}/photo?v=${encodeURIComponent(c.photo)}` : '')

// Цвет силуэта: тёмные цвета (чёрный, графит) на тёмном фоне не видны — для них серый.
export function thumbColor(color: string) {
    const hex = colorHex(color)
    if (!hex) return '#9AA7B0'
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    return 0.299 * r + 0.587 * g + 0.114 * b < 70 ? '#9AA7B0' : hex
}

// Аватарка машины: фото, а если его нет — силуэт машины её цветом.
export function CarThumb({ car, className = '' }: { car: { id: number; photo: string; color: string }; className?: string }) {
    const url = carPhotoUrl(car)
    const hex = thumbColor(car.color)
    if (url) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={url} alt="" loading="lazy" className={`rounded-lg border border-line object-cover ${className}`} />
    }
    return (
        <span className={`flex items-center justify-center rounded-lg border border-line ${className}`} style={{ background: `${hex}26` }}>
            <CarIcon size={20} color={hex} strokeWidth={2.2} />
        </span>
    )
}
