'use client'

import { useEffect, useState } from 'react'

/** 注册最小 Service Worker，用于 PWA 安装与离线打开 */
export default function ServiceWorkerRegistrar() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)

    if ('serviceWorker' in navigator) {
      const onLoad = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
          // 注册失败不影响正常使用
        })
      }
      if (document.readyState === 'complete') onLoad()
      else window.addEventListener('load', onLoad)
      return () => window.removeEventListener('load', onLoad)
    }
  }, [])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (online) return null

  return (
    <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-[var(--color-line)] bg-[var(--color-card)] px-3 py-1.5 text-[11px] text-[var(--color-muted)]">
      离线中 · 展示的是缓存数据
    </div>
  )
}
