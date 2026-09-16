import { NextResponse, type NextRequest } from 'next/server'

import { appUrl, createSession, ensureUserDefaults, upsertUser } from '@/lib/auth'
import { exchangeAndFetch } from '@/lib/oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/auth/github/callback — GitHub 回调，建立会话 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const savedState = req.cookies.get('dk_oauth_state')?.value
  const next = req.cookies.get('dk_oauth_next')?.value || '/'

  const fail = (reason: string) => {
    const res = NextResponse.redirect(appUrl(`/sign-in?error=${reason}`))
    res.cookies.delete('dk_oauth_state')
    res.cookies.delete('dk_oauth_next')
    return res
  }

  if (!code || !state || !savedState || state !== savedState) {
    return fail('state_mismatch')
  }

  const profile = await exchangeAndFetch('github', code, appUrl('/api/auth/github/callback'))
  if (!profile) return fail('oauth_failed')

  const user = await upsertUser({
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
    provider: 'github',
    githubId: profile.providerId,
  })
  await ensureUserDefaults(user.id)

  await createSession(user.id, {
    userAgent: req.headers.get('user-agent') ?? '',
    ip: req.headers.get('x-forwarded-for') ?? '',
  })

  const res = NextResponse.redirect(appUrl(next.startsWith('/') ? next : '/'))
  res.cookies.delete('dk_oauth_state')
  res.cookies.delete('dk_oauth_next')
  return res
}
