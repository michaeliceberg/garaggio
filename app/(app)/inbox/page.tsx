import Link from 'next/link'
import QRCode from 'qrcode'
import { Bot, Printer } from 'lucide-react'
import { botLink, getMasterChat, getThreads, masterLink, tgEnabled } from '@/lib/tg'
import { dateRu } from '@/lib/format'

export const dynamic = 'force-dynamic'

// «Ящик»: переписка с клиентами в Telegram-боте, подключение мастера и общий QR-код для гаража.
export default async function InboxPage() {
    if (!tgEnabled()) return <p className="card p-6 text-center text-muted">Telegram-бот ещё не настроен на сервере.</p>
    const [threads, master] = await Promise.all([getThreads(), getMasterChat()])
    const qr = await QRCode.toString(botLink() + '?start=hi', { type: 'svg', margin: 1, color: { dark: '#14181C', light: '#FFFFFF' } })
    return (
        <>
            <h1 className="text-2xl font-black">Ящик</h1>
            {!master && (
                <a href={masterLink()} target="_blank" rel="noreferrer" className="card flex items-center gap-3 border-[#2AABEE]/50 p-4">
                    <Bot size={28} className="shrink-0 text-[#2AABEE]" />
                    <div>
                        <div className="font-bold">Подключить свой Telegram</div>
                        <div className="text-sm text-muted">Сообщения клиентов будут приходить вам в Telegram, а отвечать можно прямо там.</div>
                    </div>
                </a>
            )}
            {threads.length === 0 && <p className="card p-6 text-center text-muted">Пока никто не подписался. Покажите клиенту QR-код в карточке машины или общий ниже.</p>}
            <ul className="flex flex-col gap-2">
                {threads.map((t) => (
                    <li key={t.chat_id}>
                        <Link href={`/inbox/${t.chat_id}`} className="card flex flex-col gap-1 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="truncate font-bold">{t.name || t.phone || 'Клиент'}</span>
                                {t.unread > 0
                                    ? <span className="rounded-full bg-tomato px-2 text-sm font-black text-white">{t.unread}</span>
                                    : <span className="text-xs text-muted">{dateRu(t.last_at)}</span>}
                            </div>
                            {t.cars.length > 0
                                ? <div className="truncate text-sm text-gold">{t.cars.map((c) => [c.brand, c.model, c.plate].filter(Boolean).join(' ')).join(', ')}</div>
                                : <div className="text-sm text-tomato">Машина не привязана{t.phone && ` · ${t.phone}`}</div>}
                            {t.last_text && <div className="truncate text-sm text-muted">{t.last_out ? 'Вы: ' : ''}{t.last_text}</div>}
                        </Link>
                    </li>
                ))}
            </ul>
            <details className="card p-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-bold"><Printer size={18} />Общий QR-код для гаража</summary>
                <p className="mt-2 text-sm text-muted">Распечатайте и повесьте на видном месте: клиент сканирует, делится номером телефона — бот сам находит его машины.</p>
                <div className="mx-auto mt-3 w-56 overflow-hidden rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
                <p className="mt-2 text-center text-sm text-muted">{botLink().replace('https://', '')}</p>
                {master && <p className="mt-3 text-sm text-muted">Ваш Telegram подключён. <a href={masterLink()} target="_blank" rel="noreferrer" className="text-gold">Переподключить</a></p>}
            </details>
        </>
    )
}
