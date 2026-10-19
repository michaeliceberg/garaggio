import 'server-only'
import postgres from 'postgres'

// Одно подключение на процесс (в dev Next перезагружает модули — держим клиент в globalThis).
const g = globalThis as unknown as { __sql?: ReturnType<typeof postgres> }
export const sql = g.__sql ?? postgres(process.env.DATABASE_URL!, { max: 5 })
if (process.env.NODE_ENV !== 'production') g.__sql = sql
