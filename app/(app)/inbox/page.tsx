import Link from 'next/link'
import QRCode from 'qrcode'
import { Bot, Printer } from 'lucide-react'
import { botLink, getMasters, getThreads, masterLink, tgEnabled } from '@/lib/tg'
import { tgRemoveMaster } from '@/app/actions'
import { ConfirmButton } from '@/components/confirm-button'
import { dateRu } from '@/lib/format'

export const dynamic = 'force-dynamic'

// «Ящик»: переписка с клиентами в Telegram-боте, подключение мастера и общий QR-код для гаража.
export default async function InboxPage() {
    if (!tgEnabled()) return <p className="card p-6 text-center text-muted">Telegram-бот ещё не настроен на сервере.</p>
    const [threads, masters] = await Promise.all([getThreads(), getMasters()])
    const qr = await QRCode.toString(botLink() + '?start=hi', { type: 'svg', margin: 1, color: { dark: '#14181C', light: '#FFFFFF' } })
    return (
        <>
            <h1 className="text-2xl font-black">Ящик</h1>
            <section className="card flex flex-col gap-2 p-4">
                <div className="flex items-center gap-2 font-black text-[#2AABEE]"><Bot size={20} />Маэстро в Telegram</div>
                <p className="text-sm text-muted">Им приходят сообщения клиентов и заявки на запись. Ответить клиенту может любой — остальные увидят ответ.</p>
                {masters.map((m) => (
                    <div key={m.chat_id} className="flex items-center justify-between gap-2 rounded-xl bg-bg px-3 py-2">
                        <span className="font-semibold">{m.name || 'Маэстро'}</span>
                        <form action={tgRemoveMaster.bind(null, m.chat_id)}>
                            <ConfirmButton message={`Отключить ${m.name || 'этого Маэстро'} от бота? Сообщения клиентов ему больше не будут приходить.`} className="text-sm text-muted">Отключить</ConfirmButton>
                        </form>
                    </div>
                ))}
                <a href={masterLink()} target="_blank" rel="noreferrer" className="btn-ghost min-h-[44px] text-sm">
                    <Bot size={18} className="text-[#2AABEE]" />{masters.length ? 'Подключить ещё один Telegram' : 'Подключить свой Telegram'}
                </a>
                <p className="text-xs text-muted">Откройте эту кнопку на телефоне того, кого подключаете, и нажмите «Старт» в боте.</p>
            </section>
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
            <details className="fold bg-card">
                <summary className="fold-summary"><Printer size={18} />Общий QR-код для гаража</summary>
                <div className="fold-body">
                <p className="text-sm text-muted">Распечатайте и повесьте на видном месте: клиент сканирует, делится номером телефона — бот сам находит его машины.</p>
                <div className="mx-auto mt-3 w-56 overflow-hidden rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: qr }} />
                <p className="mt-2 text-center text-sm text-muted">{botLink().replace('https://', '')}</p>
                </div>
            </details>
        </>
    )
}
