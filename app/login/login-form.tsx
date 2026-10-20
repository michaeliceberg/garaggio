// Обычная форма (работает даже без JS): POST /api/login.
export default function LoginForm({ error }: { error?: boolean }) {
    return (
        <form action="/api/login" method="post" className="card flex flex-col gap-3 p-5">
            <label className="label" htmlFor="password">Пароль Маэстро</label>
            <input id="password" name="password" type="password" autoComplete="current-password" className="input" autoFocus required />
            {error && <p className="text-sm font-semibold text-tomato">Неверный пароль</p>}
            <button className="btn-primary w-full">Войти</button>
        </form>
    )
}
