import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 全站使用 Node.js 运行时（不使用 Edge Runtime）
  serverExternalPackages: [],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'img.clerk.com' }],
  },
}

export default nextConfig
