/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // фото уходят отдельными запросами, но форма визита может нести длинный текст
        serverActions: { bodySizeLimit: '2mb' },
    },
}
export default nextConfig
