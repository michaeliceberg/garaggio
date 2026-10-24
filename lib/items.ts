// Нумерованные списки в работах, заметках и рекомендациях визита.
// Храним просто «один пункт — одна строка», номера рисуем при показе и в поле ввода.
// Новый пункт: Enter, или точка (; ! ?) и следующее слово с большой буквы — «Замена масла. Приводной ремень».

const LEAD = /^\s*(?:\d{1,2}\s*[.)]|[-–—•*])\s*/ // «1.», «2)», «-», «•» в начале строки
const SPLIT = /(?<=[.;!?])\s+(?=[А-ЯЁA-Z])/ // конец фразы + большая буква = новый пункт

export function splitItems(text: string): string[] {
    return text
        .split('\n')
        .flatMap((line) => line.split(SPLIT))
        .map((l) => l.replace(LEAD, '').replace(/[\s.;]+$/, '').trim())
        .filter(Boolean)
}
// Чистый вид для базы: пункты строками, без номеров
export const cleanItems = (text: string) => splitItems(text).join('\n')
// С номерами — для поля ввода и для сообщений
export const numberedText = (text: string) => {
    const items = splitItems(text)
    return items.length > 1 ? items.map((t, i) => `${i + 1}. ${t}`).join('\n') : items.join('')
}
