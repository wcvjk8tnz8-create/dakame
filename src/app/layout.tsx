import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'

import './globals.css'
import BottomNav from '@/components/BottomNav'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'

export const metadata: Metadata = {
  title: '打卡么 · Dakame',
  description:
    '打开即用、3 秒完成打卡的极简习惯打卡工具，支持周期目标与 AI 英语补习。',
  applicationName: '打卡么',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: '打卡么',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b0b12',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="zh-CN" suppressHydrationWarning>
        <body>
          <div className="app-shell">{children}</div>
          <BottomNav />
          <ServiceWorkerRegistrar />
        </body>
      </html>
    </ClerkProvider>
  )
}
