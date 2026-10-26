import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sql } from '@/lib/db'
import { getThread } from '@/lib/tg'
import { PlateBadge } from '@/components/plate'
import { TgReply } from '@/components/tg-reply'

export const dynamic = 'force-dynamic'

const time = (d: string) => new Date(d).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })

// Переписка с одним клиентом. Открыл — значит прочитал.
export default async function ThreadPage({ params }: { params: { chat: string } }) {
    if (!/^-?\d+$/.test(params.chat)) notFound()
    const t = await getThread(params.chat)
    if (!t) notFound()
    await sql`UPDATE tg_messages SET seen = true WHERE chat_id = ${params.chat} AND NOT out AND NOT seen`
    return (
        <>
            <section className="card flex flex-col gap-2 p-4">
                <h1 className="text-xl font-black">{t.name || 'Клиент'}</h1>
                <p className="text-sm text-muted">{[t.username && `@${t.username}`, t.phone].filter(Boolean).join(' · ') || 'Telegram'}</p>
                {t.cars.map((c) => (
                    <Link key={c.id} href={`/cars/${c.id}`} className="flex items-center gap-2 text-sm font-semibold">
                        <PlateBadge plate={c.plate} />{[c.brand, c.model].filter(Boolean).join(' ')}
                    </Link>
                ))}
                {t.cars.length === 0 && <p className="text-sm text-tomato">Машина не привязана — откройте карточку машины и покажите клиенту QR-код.</p>}
            </section>
            <ol className="flex flex-col gap-2">
                {t.messages.length === 0 && <li className="text-center text-sm text-muted">Сообщений пока нет.</li>}
                {t.messages.map((m) => (
                    <li key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.out ? 'self-end bg-[#2AABEE]/20' : 'self-start bg-card'}`}>
                        {m.media_kind && <Media id={m.id} kind={m.media_kind} />}
                        <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                        <p className="mt-1 text-right text-[11px] text-muted">{time(m.created_at)}</p>
                    </li>
                ))}
            </ol>
            <TgReply chatId={t.chat_id} />
        </>
    )
}

// Вложение в переписке: фото и стикер — картинкой, голосовое — плеером, видео — видео, остальное — ссылкой
function Media({ id, kind }: { id: number; kind: string }) {
    const src = `/api/tg-file/${id}`
    if (kind === 'photo' || kind === 'sticker')
        // eslint-disable-next-line @next/next/no-img-element
        return <a href={src} target="_blank"><img src={src} alt="" className="mb-1 max-h-72 rounded-xl" loading="lazy" /></a>
    if (kind === 'voice' || kind === 'audio') return <audio src={src} controls preload="none" className="mb-1 w-64 max-w-full" />
    if (kind === 'video' || kind === 'video_note') return <video src={src} controls preload="none" className="mb-1 max-h-72 rounded-xl" />
    return <a href={src} target="_blank" className="mb-1 block text-sm font-semibold underline">Открыть файл</a>
}
