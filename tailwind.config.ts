import type { Config } from 'tailwindcss'

const config: Config = {
    content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // Гаражная палитра: тёмный асфальт + итальянские акценты
                bg: '#14181C',
                card: '#1C2228',
                line: '#2C353D',
                muted: '#9AA7B0',
                tomato: '#E5533D',
                olive: '#8DB255',
                cream: '#F2E6CF',
                gold: '#F2C35B',
            },
        },
    },
    plugins: [],
}
export default config
