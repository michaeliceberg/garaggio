// Временная заглушка: домен и сервер работают, само приложение учёта — следующий шаг.
export default function Home() {
    return (
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 12 }}>
            <div style={{ fontSize: 64 }}>🔧</div>
            <h1 style={{ fontSize: 44, margin: 0, letterSpacing: 1 }}>Garaggio</h1>
            <p style={{ fontSize: 20, margin: 0, color: '#F2C35B' }}>Бонджорно! Гараж с характером.</p>
            <p style={{ fontSize: 16, margin: 0, color: '#9AA7B0', maxWidth: 420 }}>
                Скоро здесь: история обслуживания вашей машины, фото работ и напоминания о ТО.
            </p>
        </main>
    )
}
