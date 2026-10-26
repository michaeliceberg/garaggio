import 'server-only'
import { sql } from '@/lib/db'
import { POLICY_VERSION } from '@/lib/legal'

// Запись согласия на обработку ПДн — доказательство, что человек согласился, когда и на какую редакцию политики
export async function recordConsent(c: { source: 'booking' | 'bot_contact' | 'bot_car'; phone?: string; name?: string; chatId?: string; appointmentId?: number }) {
    await sql`INSERT INTO pd_consents (source, phone, name, tg_chat_id, appointment_id, policy_version)
              VALUES (${c.source}, ${c.phone ?? ''}, ${c.name ?? ''}, ${c.chatId ?? null}, ${c.appointmentId ?? null}, ${POLICY_VERSION})`
}
