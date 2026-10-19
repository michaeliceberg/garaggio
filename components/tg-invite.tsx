import Link from 'next/link'
import QRCode from 'qrcode'
import { Bot, MessagesSquare } from 'lucide-react'
import type { Car } from '@/lib/data'
import { carLink, tgEnabled } from '@/lib/tg'
import { tgUnlinkCar } from '@/app/actions'
import { ConfirmButton } from './confirm-button'
import { MessageButtons } from './message-buttons'

// Блок Telegram в карточке машины: подписан — ссылка на переписку; нет — QR (показать с телефона)
// и готовое приглашение со ссылкой, чтобы отправить клиенту в WhatsApp/SMS.
export async function TgInvite({ car }: { car: Car }) {
    if (!tgEnabled()) return null
    if (car.tg_chat_id) {
        return (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[#2AABEE]/10 p-3 text-sm">
                <span className="flex items-center gap-2 font-bold text-[#2AABEE]"><Bot size={18} />Подписан на бот</span>
                <div className="flex items-center gap-3">
                    <Link href={`/inbox/${car.tg_chat_id}`} className="flex items-center gap-1 font-semibold text-gold"><MessagesSquare size={16} />Переписка</Link>
                    <form action={tgUnlinkCar.bind(null, car.id)}>
                        <ConfirmButton message="Отвязать Telegram от этой машины? Напоминания туда больше не придут." className="text-muted">Отвязать</ConfirmButton>
                    </form>
                </div>
            </div>
        )
    }
    const url = carLink(car.id)
    const svg = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#14181C', light: '#FFFFFF' } })
    const hi = car.owner_name ? `Чао, ${car.owner_name.split(' ')[0]}!` : 'Чао!'
    const text = `${hi} Это Garaggio 🤌 Подпишитесь на нашего бота — пришлём напоминание, когда пора на ТО, и отчёт после визита: ${url}`
    return (
        <details className="rounded-xl bg-bg p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-bold"><Bot size={18} className="text-[#2AABEE]" />Подписать на Telegram-бот</summary>
            <div className="mt-3 flex flex-col gap-3">
                <p className="text-sm text-muted">Клиент наводит камеру на QR-код — и сразу подписан на эту машину.</p>
                <div className="mx-auto w-56 overflow-hidden rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
                <p className="text-sm text-muted">Или отправьте приглашение:</p>
                <MessageButtons phone={car.owner_phone} templates={[{ id: 'tg', label: 'Приглашение', text }]} />
            </div>
        </details>
    )
}
