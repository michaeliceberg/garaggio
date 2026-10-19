import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Garaggio — гараж с характером',
    description: 'Учёт обслуживания машин: история ремонтов, фото и напоминания клиентам.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ru">
            <body style={{ margin: 0, background: '#14181C', color: '#F2F4F6', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
                {children}
            </body>
        </html>
    )
}
