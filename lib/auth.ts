import 'server-only'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Вход один — для мастера. Пароль в .env (MASTER_PASSWORD), в cookie — подписанная метка с датой входа.
const COOKIE = 'garaggio_session'
const MAX_AGE = 60 * 60 * 24 * 90 // 90 дней — чтобы не вводить пароль каждый раз в гараже

const sign = (v: string) => crypto.createHmac('sha256', process.env.SESSION_SECRET!).update(v).digest('hex')

export function checkPassword(pw: string) {
    const a = Buffer.from(pw)
    const b = Buffer.from(process.env.MASTER_PASSWORD ?? '')
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
