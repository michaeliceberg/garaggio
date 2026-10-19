import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Garaggio — гараж с характером',
    description: 'Учёт обслуживания машин: история ремонтов, фото и напоминания клиентам.',
    manifest: '/manifest.webmanifest',
    icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: 'Garaggio', statusBarStyle: 'black-translucent' },
}
export const viewport: Viewport = { themeColor: '#14181C', width: 'device-width', initialScale: 1, maximumScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ru">
            <body className="min-h-screen font-sans antialiased">{children}</body>
        </html>
    )
}
