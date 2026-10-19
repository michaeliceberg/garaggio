import 'server-only'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Вход один — для мастера. Пароль в .env (MASTER_PASSWORD), в cookie — подписанная метка с датой входа.
const COOKIE = 'garaggio_session'
const MAX_AGE = 60 * 60 * 24 * 90 // 90 дней — чтобы не вводить пароль каждый раз в гараже

const sign = (v: string) => crypto.createHmac('sha256', process.env.SESSION_SECRET!).update(v).digest('hex')

// Пароль сравниваем «по-человечески»: без учёта регистра, лишних пробелов и оттенка кожи / варианта эмодзи
// (на разных телефонах 🤌 вставляется с разными невидимыми добавками).
const normPw = (s: string) => s.normalize('NFC').replace(/[\u{1F3FB}-\u{1F3FF}\uFE0E\uFE0F\u200D]/gu, '').replace(/\s+/g, ' ').trim().toLowerCase()
export function checkPassword(pw: string) {
    const a = Buffer.from(normPw(pw))
    const b = Buffer.from(normPw(process.env.MASTER_PASSWORD ?? ''))
    return a.length === b.length && b.length > 0 && crypto.timingSafeEqual(a, b)
}
export function sessionCookie() {
    const v = `master.${Date.now()}`
    return { name: COOKIE, value: `${v}.${sign(v)}`, options: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: MAX_AGE, path: '/' } }
}
export function endSession() { cookies().delete(COOKIE) }
export function isAuthed() {
    const raw = cookies().get(COOKIE)?.value
    if (!raw) return false
    const i = raw.lastIndexOf('.')
    const v = raw.slice(0, i), s = raw.slice(i + 1)
    const ok = sign(v)
    return s.length === ok.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(ok))
}
export function requireAuth() { if (!isAuthed()) redirect('/login') }
