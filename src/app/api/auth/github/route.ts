import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

import { appUrl } from '@/lib/auth'
import { buildAuthorizeUrl, isProviderConfigured } from '@/lib/oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/auth/github — 跳转到 GitHub 授权页 */
export async function GET(req: NextRequest) {
  if (!isProviderConfigured('github')) {
    return NextResponse.redirect(appUrl('/sign-in?error=github_not_configured'))
  }

  const state = randomBytes(16).toString('hex')
  const next = req.nextUrl.searchParams.get('next') || '/'
  const redirectUri = appUrl('/api/auth/github/callback')

  const res = NextResponse.redirect(buildAuthorizeUrl('github', redirectUri, state))
  res.cookies.set('dk_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  })
  res.cookies.set('dk_oauth_next', next, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  })
  return res
}
