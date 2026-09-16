import { NextResponse, type NextRequest } from 'next/server'

import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/cookies'
import { verifyAccessToken } from '@/lib/jwt'

/**
 * 轻量路由保护（Edge 安全，不访问 Redis）：
 *  - access JWT 有效 → 直接放行
 *  - 没有 refresh cookie → 重定向登录
 *  - 有 refresh cookie 但 access 过期 → 放行，交给 Node 运行时换签续期
 */

const PUBLIC_PATHS = ['/sign-in', '/sign-up', '/sponsor', '/api/auth']

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  if (isPublic(pathname)) return NextResponse.next()

  const access = req.cookies.get(ACCESS_COOKIE)?.value
  if (access && (await verifyAccessToken(access))) return NextResponse.next()

  const refresh = req.cookies.get(REFRESH_COOKIE)?.value
  if (refresh) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/sign-in'
  url.search = ''
  if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
