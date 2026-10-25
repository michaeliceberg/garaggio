import Link from 'next/link'
import { Phone } from 'lucide-react'
import { getDue } from '@/lib/data'
import { dateRu, km, telHref } from '@/lib/format'
import { PlateBadge } from '@/components/plate'
import { MessageButtons } from '@/components/message-buttons'
import { dueText } from '@/lib/messages'
import { ttsEnabled } from '@/lib/tts'

// Кого пора звать: срок ТО через 14 дней или уже прошёл — по дате или по прикинутому пробегу.
export default async function DuePage() {
    const due = await getDue()
    return (
        <>
            <h1 className="text-2xl font-black">Пора на ТО</h1>
            <p className="text-sm text-muted">Срок в ближайшие 2 недели или уже прошёл. Пробег прикидываем по тому, сколько машина ездит между визитами.</p>
            {due.length === 0 && <p className="card p-6 text-center text-muted">Сейчас звать некого — пиздати фантастико! 🤌</p>}
            <ul className="flex flex-col gap-2">
                {due.map((c) => {
                    const overdue = (c.days_left != null && c.days_left < 0) || (c.km_left != null && c.km_left < 0)
                    return (
                        <li key={c.id} className="card flex flex-col gap-2 p-3">
                            <Link href={`/cars/${c.id}`} className="flex items-center gap-3">
                                <PlateBadge plate={c.plate} />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate font-bold">{[c.brand, c.model].filter(Boolean).join(' ')}</div>
                                    <div className="truncate text-sm text-muted">{c.owner_name}</div>
                                </div>
                            </Link>
                            <div className={`rounded-xl p-2 text-sm font-semibold ${overdue ? 'bg-tomato/15 text-tomato' : 'bg-gold/10 text-gold'}`}>
                                {c.days_left != null && (c.days_left < 0 ? `Просрочено на ${-c.days_left} дн. (${dateRu(c.next_date)})` : `Через ${c.days_left} дн. — ${dateRu(c.next_date)}`)}
                                {c.km_left != null && c.km_left <= 700 && <div>Пробег ≈ {km(c.est_mileage)} из {km(c.next_mileage)}</div>}
                            </div>
                            {c.owner_phone || c.tg_chat_id ? (
                                <details className="fold">
                                    <summary className="fold-summary">
                                        <span className="mr-auto">💬 Связаться с клиентом{c.tg_chat_id && ' · 🤖'}</span>
                                        {c.owner_phone ? <a href={telHref(c.owner_phone)} className="flex items-center gap-1 text-sm text-muted"><Phone size={16} />{c.owner_phone}</a> : <span className="text-sm text-[#2AABEE]">Telegram</span>}
                                    </summary>
                                    <div className="fold-body"><MessageButtons phone={c.owner_phone} templates={[{ id: 'due', label: 'Пора на ТО', text: dueText(c, c.next_date) }]} tgCarId={c.tg_chat_id ? c.id : null} voice={ttsEnabled()} /></div>
                                </details>
                            ) : <p className="text-sm text-muted">Телефон не указан</p>}
                        </li>
                    )
                })}
            </ul>
        </>
    )
}
