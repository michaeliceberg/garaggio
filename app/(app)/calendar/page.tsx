import Link from 'next/link'
import { ChevronLeft, ChevronRight, Phone, Plus, Wrench, Pencil, Car as CarIcon } from 'lucide-react'
import { countByDay, endTime, getDay, nowMskTime, todayMsk, WORK_DAY, apptWho, apptCar, apptPhone, type Appt } from '@/lib/appts'
import { telHref } from '@/lib/format'
import { apptText, BOOKING_URL } from '@/lib/messages'
import { ttsEnabled } from '@/lib/tts'
import { confirmAppt, setApptStatus } from '@/app/actions'
import QRCode from 'qrcode'
import { Link2 } from 'lucide-react'
import { PlateBadge } from '@/components/plate'
import { MessageButtons } from '@/components/message-buttons'

export const dynamic = 'force-dynamic'

const addDays = (day: string, n: number) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const fmt = (day: string, o: Intl.DateTimeFormatOptions) => new Date(day + 'T12:00:00Z').toLocaleDateString('ru-RU', { timeZone: 'UTC', ...o })
const minutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

// Календарь записи: полоска дней сверху, ниже — день по порядку: записи и свободные окна между ними.
export default async function CalendarPage({ searchParams }: { searchParams: { d?: string } }) {
    const today = todayMsk()
    const day = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.d ?? '') ? searchParams.d! : today
    const stripFrom = addDays(day, -3)
    const stripDays = Array.from({ length: 14 }, (_, i) => addDays(stripFrom, i))
    const [appts, counts] = await Promise.all([getDay(day), countByDay(stripDays[0], stripDays[13])])
    const voice = ttsEnabled()

    // свободные окна рабочего дня между записями (для сегодня — только то, что ещё впереди)
    const active = appts.filter((a) => a.status !== 'cancelled')
    const gaps: { from: string; to: string }[] = []
    let cursor = minutes(WORK_DAY.from)
    if (day === today) cursor = Math.max(cursor, Math.ceil(minutes(nowMskTime()) / 30) * 30)
    const close = minutes(WORK_DAY.to)
    for (const a of active) {
        const s = minutes(a.start_time)
        if (s - cursor >= 30 && cursor < close) gaps.push({ from: hhmm(cursor), to: hhmm(Math.min(s, close)) })
        cursor = Math.max(cursor, s + a.duration_min)
    }
    if (close - cursor >= 30 && day >= today) gaps.push({ from: hhmm(cursor), to: hhmm(close) })
    const items = [...appts.map((a) => ({ t: a.start_time, a })), ...gaps.map((g) => ({ t: g.from, g }))].sort((x, y) => x.t.localeCompare(y.t))

    return (
        <>
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-2xl font-black">Запись</h1>
                <Link href="/order" className="rounded-full border border-gold/50 px-3 py-1 text-sm font-semibold text-gold">🛒 Что заказать</Link>
                <span className="text-sm font-semibold text-muted first-letter:uppercase">{fmt(day, { month: 'long', year: 'numeric' }).replace(/\s*г\.$/, '')}</span>
            </div>
            <div className="flex items-center gap-1">
                <Link href={`/calendar?d=${addDays(day, -7)}`} className="btn-ghost min-h-[44px] px-2" aria-label="Неделя назад"><ChevronLeft size={18} /></Link>
                <div className="flex flex-1 gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
                    {stripDays.map((d) => {
                        const sel = d === day
                        const weekend = [0, 6].includes(new Date(d + 'T12:00:00Z').getUTCDay())
                        return (
                            <Link key={d} href={`/calendar?d=${d}`} scroll={false}
                                className={`flex min-w-[46px] flex-col items-center rounded-xl border py-1.5 text-xs font-semibold transition ${sel ? 'border-basil bg-basil text-white' : d === today ? 'border-gold/60 text-gold' : 'border-line text-muted'}`}>
                                <span className={`capitalize ${weekend && !sel ? 'text-tomato/80' : ''}`}>{fmt(d, { weekday: 'short' })}</span>
                                <span className="text-lg font-black leading-tight">{fmt(d, { day: 'numeric' })}</span>
                                <span className={`h-1.5 w-1.5 rounded-full ${counts[d] ? (sel ? 'bg-white' : 'bg-olive') : 'bg-transparent'}`} />
                            </Link>
                        )
                    })}
                </div>
                <Link href={`/calendar?d=${addDays(day, 7)}`} className="btn-ghost min-h-[44px] px-2" aria-label="Неделя вперёд"><ChevronRight size={18} /></Link>
            </div>
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black first-letter:uppercase">{day === today ? 'Сегодня' : day === addDays(today, 1) ? 'Завтра' : fmt(day, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
                {day !== today && <Link href="/calendar" className="text-sm font-semibold text-gold">К сегодня</Link>}
            </div>

            <ol className="flex flex-col gap-2">
                {items.map((it) => 'a' in it && it.a
                    ? <ApptCard key={`a${it.a.id}`} a={it.a} past={day < today} voice={voice} />
                    : 'g' in it && it.g && (
                        <li key={`g${it.g.from}`}>
                            <Link href={`/calendar/new?d=${day}&t=${it.g.from}`} className="flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-2.5 text-sm text-muted active:bg-card">
                                <span>Свободно {it.g.from}–{it.g.to}</span>
                                <span className="flex items-center gap-1 font-bold text-olive"><Plus size={16} />Записать</span>
                            </Link>
                        </li>
                    ))}
                {items.length === 0 && <li className="card p-6 text-center text-muted">{day < today ? 'В этот день записей не было.' : 'Записей нет.'}</li>}
            </ol>
            {day >= today && <Link href={`/calendar/new?d=${day}`} className="btn-primary w-full"><Plus size={20} />Записать на этот день</Link>}
            <SelfBookingLink />
        </>
    )
}

// Ссылка для самозаписи клиентов: QR (распечатать в гараже) и готовое сообщение со ссылкой
async function SelfBookingLink() {
    const url = BOOKING_URL
    const svg = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#14181C', light: '#FFFFFF' } })
    return (
        <details className="fold bg-card">
            <summary className="fold-summary"><Link2 size={18} className="text-olive" />Ссылка для самозаписи клиентов</summary>
            <div className="fold-body flex flex-col gap-3">
                <p className="text-sm text-muted">Клиент открывает ссылку, выбирает свободное время — заявка появляется здесь, а вам приходит сообщение в Telegram. Вы подтверждаете одной кнопкой.</p>
                <a href={url} target="_blank" rel="noreferrer" className="break-all text-center font-bold text-gold">garaggio.ru/zapis</a>
                <div className="mx-auto w-48 overflow-hidden rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
                <MessageButtons phone="" templates={[{ id: 'self', label: 'Ссылка', text: `Чао! Это Garaggio 🤌 Записаться к нам можно здесь — выберите удобное время: ${url}` }]} />
            </div>
        </details>
    )
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

function ApptCard({ a, past, voice }: { a: Appt; past: boolean; voice: boolean }) {
    const phone = apptPhone(a)
    const cancelled = a.status === 'cancelled'
    const done = a.status === 'done'
    const msg = { brand: a.brand ?? '', model: a.model ?? '', owner_name: apptWho(a) === 'Клиент' ? '' : apptWho(a) }
    return (
        <li className={`card flex flex-col gap-2 p-3 ${cancelled ? 'opacity-50' : ''} ${done ? 'border-olive/40' : ''} ${a.status === 'pending' ? 'border-gold/60' : ''}`}>
            <div className="flex items-start gap-3">
                <div className="w-14 shrink-0 text-center">
                    <div className={`text-lg font-black leading-tight ${cancelled ? 'line-through' : ''}`}>{a.start_time}</div>
                    <div className="text-xs text-muted">до {endTime(a.start_time, a.duration_min)}</div>
                </div>
                <div className="min-w-0 flex-1">
                    {a.car_id ? (
                        <Link href={`/cars/${a.car_id}`} className="flex flex-wrap items-center gap-2">
                            <PlateBadge plate={a.plate ?? ''} /><span className="truncate font-bold">{apptCar(a) || 'Машина'}</span>
                        </Link>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2">
                            {a.client_plate && <PlateBadge plate={a.client_plate} />}
                            <span className="font-bold">{a.client_name || 'Новый клиент'}</span>
                            <span className="text-xs font-semibold text-gold">{a.client_car || 'машина не заведена'}</span>
                        </div>
                    )}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                        {a.car_id && <span>{apptWho(a)}</span>}
                        {phone && <a href={telHref(phone)} className="flex items-center gap-1"><Phone size={14} />{phone}</a>}
                    </div>
                    {a.work && <p className="mt-1 whitespace-pre-wrap text-sm">{a.work}</p>}
                    {done && <p className="mt-1 text-sm font-bold text-olive">✓ Приехал{a.visit_id && <> · <Link href={`/visits/${a.visit_id}`} className="underline">визит</Link></>}</p>}
                    {cancelled && <p className="mt-1 text-sm font-bold text-tomato">Отменено</p>}
                    {a.status === 'pending' && <p className="mt-1 text-sm font-bold text-gold">🆕 Заявка с сайта — ждёт подтверждения</p>}
                    {a.status === 'planned' && a.client_confirm === 'yes' && <p className="mt-1 text-sm font-bold text-olive">✅ Клиент подтвердил в боте</p>}
                    {a.status === 'planned' && a.client_confirm === 'move' && <p className="mt-1 text-sm font-bold text-gold">🔁 Клиент просит перенести — напишите ему</p>}
                </div>
                <Link href={`/calendar/${a.id}`} className="text-muted" aria-label="Изменить запись"><Pencil size={18} /></Link>
            </div>
            {a.status === 'pending' && (
                <div className="grid grid-cols-2 gap-2">
                    <form action={confirmAppt.bind(null, a.id)}><button className="btn-primary min-h-[44px] w-full px-3 text-sm">Подтвердить</button></form>
                    <form action={setApptStatus.bind(null, a.id, 'cancelled')}><button className="btn-ghost min-h-[44px] w-full px-3 text-sm text-muted">Отклонить</button></form>
                </div>
            )}
            {a.status === 'planned' && (
                <>
                    <div className="grid grid-cols-2 gap-2">
                        {a.car_id
                            ? <Link href={`/cars/${a.car_id}/visits/new?appt=${a.id}`} className="btn-primary min-h-[44px] px-3 text-sm"><Wrench size={18} />Начать визит</Link>
                            : <Link href={`/cars/new?appt=${a.id}&name=${encodeURIComponent(a.client_name)}&phone=${encodeURIComponent(a.client_phone)}&plate=${encodeURIComponent(a.client_plate)}`} className="btn-primary min-h-[44px] px-3 text-sm"><CarIcon size={18} />Завести машину</Link>}
                        <form action={setApptStatus.bind(null, a.id, 'cancelled')}>
                            <button className="btn-ghost min-h-[44px] w-full px-3 text-sm text-muted">Отменить</button>
                        </form>
                    </div>
                    {!past && (phone || a.tg_chat_id) && (
                        <details className="fold">
                            <summary className="fold-summary text-sm">💬 Напомнить о записи</summary>
                            <div className="fold-body">
                                <MessageButtons phone={phone ?? ''} templates={[{ id: 'appt', label: 'Запись', text: apptText(msg, a.day, a.start_time, a.work) }]}
                                    tgCarId={a.tg_chat_id ? a.car_id : null} voice={voice} />
                            </div>
                        </details>
                    )}
                </>
            )}
            {cancelled && (
                <form action={setApptStatus.bind(null, a.id, 'planned')}>
                    <button className="text-sm font-semibold text-gold">Вернуть запись</button>
                </form>
            )}
        </li>
    )
}
