// Готовые тексты для клиентов (в духе Garaggio — дружелюбно, с итальянской ноткой).
import { dateRu } from './format'

export type MsgCar = { brand: string; model: string; owner_name: string }
const carName = (c: MsgCar) => [c.brand, c.model].filter(Boolean).join(' ') || 'вашей машине'
const hello = (c: MsgCar) => (c.owner_name ? `Чао, ${c.owner_name.split(' ')[0]}!` : 'Чао!')

export type MsgTemplate = { id: string; label: string; text: string }

export function dueText(c: MsgCar, nextDate?: string | null) {
    const when = nextDate && new Date(nextDate) > new Date() ? ` (${dateRu(nextDate)})` : ''
    return `${hello(c)} Это Garaggio 🤌 Вашему ${carName(c)} пора на техобслуживание${when}. Когда вам удобно заехать?`
}
export function templatesFor(c: MsgCar, nextDate?: string | null): MsgTemplate[] {
    return [
        { id: 'due', label: 'Пора на ТО', text: dueText(c, nextDate) },
        { id: 'ready', label: 'Машина готова', text: `${hello(c)} ${carName(c)} готова, можно забирать 🚗 Ждём вас в Garaggio!` },
        { id: 'thanks', label: 'Спасибо', text: `${hello(c)} Грацие, что заехали в Garaggio! Если что-то будет беспокоить в машине — пишите 🤌` },
    ]
}

// Телефон для ссылок: только цифры, российский номер приводим к виду 7XXXXXXXXXX
export function phoneDigits(p: string) {
    let d = p.replace(/\D/g, '')
    if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1)
    if (d.length === 10) d = '7' + d
    return d
}

// Подтверждение записи: «Ждём вас 24 октября в 10:00 — ТО»
export function apptText(c: MsgCar, day: string, time: string, work: string) {
    const d = new Date(day + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })
    const what = work.trim() ? ` — ${work.trim().split('\n')[0].toLowerCase()}` : ''
    const car = c.brand || c.model ? ` на ${carName(c)}` : ''
    return `${hello(c)} Это Garaggio 🤌 Ждём вас${car} ${d} в ${time}${what}. Если планы поменяются — напишите, пожалуйста. Грацие!`
}
