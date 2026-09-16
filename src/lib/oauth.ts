/**
 * OAuth2 适配层。
 * 目前内置 GitHub，新增 provider 只需往 PROVIDERS 里加一条配置。
 *
 * GitHub OAuth App 配置：
 *   Homepage URL:               https://your-domain.com
 *   Authorization callback URL: https://your-domain.com/api/auth/github/callback
 */

export type OAuthProviderId = 'github'

export type OAuthProviderConfig = {
  id: OAuthProviderId
  label: string
  clientId?: string
  clientSecret?: string
  authorizeUrl: string
  tokenUrl: string
  userUrl: string
  scope: string
}

export const PROVIDERS: Record<OAuthProviderId, OAuthProviderConfig> = {
  github: {
    id: 'github',
    label: 'GitHub',
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userUrl: 'https://api.github.com/user',
    scope: 'read:user user:email',
  },
}

export function isProviderConfigured(id: OAuthProviderId): boolean {
  const p = PROVIDERS[id]
  return Boolean(p.clientId && p.clientSecret)
}

export function configuredProviders(): OAuthProviderConfig[] {
  return Object.values(PROVIDERS).filter((p) => Boolean(p.clientId && p.clientSecret))
}

/** 构造授权跳转地址（带 state 防 CSRF） */
export function buildAuthorizeUrl(
  id: OAuthProviderId,
  redirectUri: string,
  state: string,
): string {
  const p = PROVIDERS[id]
  const url = new URL(p.authorizeUrl)
  url.searchParams.set('client_id', p.clientId as string)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', p.scope)
  url.searchParams.set('state', state)
  url.searchParams.set('allow_signup', 'true')
  return url.toString()
}

export type OAuthProfile = {
  providerId: string
  email: string
  name: string
  avatarUrl: string
}

/** 用 code 换 token → 拉用户信息 */
export async function exchangeAndFetch(
  id: OAuthProviderId,
  code: string,
  redirectUri: string,
): Promise<OAuthProfile | null> {
  const p = PROVIDERS[id]
  if (!p.clientId || !p.clientSecret) return null

  const tokenRes = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: p.clientId,
      client_secret: p.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    cache: 'no-store',
  })
  if (!tokenRes.ok) return null

  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string }
  if (!tokenJson.access_token) return null

  const userRes = await fetch(p.userUrl, {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: 'application/json',
      'User-Agent': 'dakame-app',
    },
    cache: 'no-store',
  })
  if (!userRes.ok) return null

  const gh = (await userRes.json()) as {
    id?: number
    login?: string
    name?: string | null
    avatar_url?: string
    email?: string | null
  }
  if (!gh.id) return null

  let email = gh.email
  if (!email) {
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: 'application/json',
        'User-Agent': 'dakame-app',
      },
      cache: 'no-store',
    })
    if (emailRes.ok) {
      const list = (await emailRes.json()) as { email?: string; primary?: boolean }[]
      email = list.find((e) => e.primary)?.email ?? list[0]?.email ?? null
    }
  }

  return {
    providerId: String(gh.id),
    email: email || `${gh.login ?? gh.id}@users.noreply.github.com`,
    name: gh.name || gh.login || 'GitHub 用户',
    avatarUrl: gh.avatar_url ?? '',
  }
}
