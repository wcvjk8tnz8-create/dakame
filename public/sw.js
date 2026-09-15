/* 打卡么 · 最小 Service Worker
 * 目标：让 App 可安装、可离线打开（离线展示缓存数据，联网后自动同步）
 * 策略：
 *  - 导航请求：网络优先，失败回退到缓存的首页
 *  - 同源静态资源（/_next/static、图标、manifest）：stale-while-revalidate
 *  - 其它请求（Clerk / Upstash / AI 等第三方）：直接放行，不缓存
 */

const VERSION = 'dakame-v1'
const STATIC_CACHE = `${VERSION}-static`
const PAGES = ['/', '/calendar', '/goals', '/settings', '/learn']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll(['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']),
      )
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // 导航：网络优先 → 缓存兜底
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then((cache) => cache.put('/', copy))
          return res
        })
        .catch(() => caches.match('/').then((hit) => hit || caches.match('/icon-192.png'))),
    )
    return
  }

  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icon') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.svg')

  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            const copy = res.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            return res
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})
