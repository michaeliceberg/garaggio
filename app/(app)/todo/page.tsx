import { sql } from '@/lib/db'
import { TodoList, type Todo } from '@/components/todo-list'

export const dynamic = 'force-dynamic'

// «Купить и сделать»: что докупить в гараж и что сделать по гаражу (не по машинам клиентов)
export default async function TodoPage() {
    const todos = await sql<Todo[]>`
        SELECT id, text, kind, done FROM garage_todos
        WHERE NOT done OR done_at > now() - interval '7 days' ORDER BY done, created_at DESC, id DESC`
    return (
        <>
            <div>
                <h1 className="text-2xl font-black">Купить и сделать</h1>
                <p className="text-sm text-muted">Что докупить в гараж и что сделать по хозяйству. Выполненное — галочкой, через неделю пропадёт само.</p>
            </div>
            <TodoList todos={todos} />
        </>
    )
}
