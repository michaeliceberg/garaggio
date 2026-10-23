import { runReminders } from '@/lib/reminders'

// Cron на сервере раз в час: curl -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3005/api/cron/reminders
export const dynamic = 'force-dynamic'
export async function GET(req: Request) {
    if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('forbidden', { status: 403 })
    return Response.json(await runReminders())
}
