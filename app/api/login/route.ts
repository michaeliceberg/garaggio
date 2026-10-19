import { NextResponse } from 'next/server'
import { checkPassword, sessionCookie } from '@/lib/auth'

// Вход обычной формой: при верном пароле ставим cookie прямо в ответе и уводим на главную.
export async function POST(req: Request) {
    const form = await req.formData()
    const url = new URL(req.url)
    const base = `${req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')}://${req.headers.get('host')}`
    if (!checkPassword(String(form.get('password') ?? ''))) return NextResponse.redirect(`${base}/login?error=1`, 303)
    const res = NextResponse.redirect(`${base}/`, 303)
    const c = sessionCookie()
    res.cookies.set(c.name, c.value, c.options)
    return res
}
