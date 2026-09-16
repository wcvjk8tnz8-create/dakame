/**
 * 自研认证：JWT（短期 access）+ Redis（可撤销 refresh session）混合方案。
 *
 * 设计：
 *  - cookie `dk_at`  : 短期 access JWT（jose HS256，15 分钟）。middleware 里纯签名校验即可放行，
 *                      无需访问 Redis，快。
 *  - cookie `dk_rt`  : refresh token（32 字节随机 hex，只存 Redis 的 sha256）。
 *                      access 过期后由 Node 运行时用它换签，实现滑动续期。
 *  - 撤销：删除 Redis 里的 session 即可让该设备立即失效（access JWT 最多还能活 15 分钟）。
 */

import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { ACCESS_COOKIE, REFRESH_COOKIE } from './cookies'
import { ACCESS_TTL_SECONDS, signAccessToken, verifyAccessToken } from './jwt'
import { getRedis, KEY } from './redis'

export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60

export { ACCESS_COOKIE, REFRESH_COOKIE, signAccessToken, verifyAccessToken, ACCESS_TTL_SECONDS }

export type SessionUser = {
  id: string
  email: string
  name: string
  avatarUrl: string
  provider: 'github' | 'email' | 'dev'
}

export type SessionRecord = {
  userId: string
  createdAt: string
  userAgent: string
  ip: string
}

export function newUserId(): string {
  return `u_${randomUUID().replace(/-/g, '').slice(0, 20)}`
}

export function newRefreshToken(): string {
  return randomBytes(32).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function baseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  return raw.replace(/\/$/, '')
}

export function appUrl(path = '/'): string {
  return `${baseUrl()}${path}`
}

/** 签发短期 access JWT */
export async function signAccessToken(userId: string): Promise<string> {
  const { SignJWT } = await import('jose')
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .sign(secretKey())
}

/** 校验 access JWT（不查 Redis，middleware 也能用） */
export async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { jwtVerify } = await import('jose')
    const { payload } = await jwtVerify(token, secretKey())
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

/** 创建会话：写 Redis + 下發两个 cookie */
export async function createSession(
  userId: string,
  meta: { userAgent?: string; ip?: string } = {},
): Promise<void> {
  const redis = getRedis()
  const token = newRefreshToken()
  const record: SessionRecord = {
    userId,
    createdAt: new Date().toISOString(),
    userAgent: (meta.userAgent ?? '').slice(0, 200),
    ip: (meta.ip ?? '').slice(0, 64),
  }

  await redis.set(KEY.session(hashToken(token)), JSON.stringify(record), {
    ex: REFRESH_TTL_SECONDS,
  })
  // 反查索引，便于「登出所有设备」
  await redis.sadd(KEY.userSessions(userId), hashToken(token))

  const jar = await cookies()
  const access = await signAccessToken(userId)

  jar.set(ACCESS_COOKIE, access, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ACCESS_TTL_SECONDS,
  })
  jar.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: REFRESH_TTL_SECONDS,
  })
}

/** 读取当前会话；access 失效时用 refresh token 换签（滑动续期） */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies()

  const access = jar.get(ACCESS_COOKIE)?.value
  if (access) {
    const userId = await verifyAccessToken(access)
    if (userId) {
      const user = await getUserById(userId)
      if (user) return user
    }
  }

  const refresh = jar.get(REFRESH_COOKIE)?.value
  if (!refresh) return null

  const redis = getRedis()
  const raw = await redis.get<SessionRecord | string>(KEY.session(hashToken(refresh)))
  if (!raw) return null

  const record: SessionRecord = typeof raw === 'string' ? (JSON.parse(raw) as SessionRecord) : raw
  const user = await getUserById(record.userId)
  if (!user) return null

  // 换签 + 续期
  await redis.expire(KEY.session(hashToken(refresh)), REFRESH_TTL_SECONDS)
  const newAccess = await signAccessToken(user.id)
  jar.set(ACCESS_COOKIE, newAccess, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ACCESS_TTL_SECONDS,
  })

  return user
}

/** 页面 / Server Action 用：拿不到就跳登录 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/sign-in')
  return user
}

/** 登出当前设备 */
export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies()
  const refresh = jar.get(REFRESH_COOKIE)?.value
  if (refresh) {
    const redis = getRedis()
    const raw = await redis.get<SessionRecord | string>(KEY.session(hashToken(refresh)))
    if (raw) {
      const record: SessionRecord =
        typeof raw === 'string' ? (JSON.parse(raw) as SessionRecord) : raw
      await redis.srem(KEY.userSessions(record.userId), hashToken(refresh))
    }
    await redis.del(KEY.session(hashToken(refresh)))
  }
  jar.delete(ACCESS_COOKIE)
  jar.delete(REFRESH_COOKIE)
}

/** 登出所有设备 */
export async function destroyAllSessions(userId: string): Promise<number> {
  const redis = getRedis()
  const hashes = (await redis.smembers(KEY.userSessions(userId))) as string[]
  if (hashes.length > 0) {
    await redis.del(...hashes.map((h) => KEY.session(h)))
    await redis.del(KEY.userSessions(userId))
  }
  return hashes.length
}

export async function countSessions(userId: string): Promise<number> {
  const redis = getRedis()
  const members = await redis.smembers(KEY.userSessions(userId))
  return Array.isArray(members) ? members.length : 0
}

// ---------------------------------------------------------------- 用户表

export type AuthUser = SessionUser & {
  githubId?: string
  createdAt: string
  lastLoginAt: string
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  const redis = getRedis()
  const raw = await redis.hgetall<Record<string, unknown>>(KEY.authUser(userId))
  if (!raw || !raw.id) return null
  return {
    id: String(raw.id),
    email: String(raw.email ?? ''),
    name: String(raw.name ?? ''),
    avatarUrl: String(raw.avatarUrl ?? ''),
    provider: (raw.provider as AuthUser['provider']) ?? 'email',
    githubId: raw.githubId ? String(raw.githubId) : undefined,
    createdAt: String(raw.createdAt ?? ''),
    lastLoginAt: String(raw.lastLoginAt ?? ''),
  }
}

export async function upsertUser(input: {
  id?: string
  email: string
  name?: string
  avatarUrl?: string
  provider: AuthUser['provider']
  githubId?: string
}): Promise<AuthUser> {
  const redis = getRedis()

  // 先按身份索引查是否已存在
  let userId = input.id
  if (!userId && input.githubId) {
    userId = (await redis.get<string>(KEY.githubIndex(input.githubId))) ?? undefined
  }
  if (!userId && input.email) {
    userId = (await redis.get<string>(KEY.emailIndex(input.email.toLowerCase()))) ?? undefined
  }
  if (!userId) userId = newUserId()

  const existing = await getUserById(userId)
  const now = new Date().toISOString()

  const user: AuthUser = {
    id: userId,
    email: input.email,
    name: input.name || existing?.name || input.email.split('@')[0] || '打卡用户',
    avatarUrl: input.avatarUrl || existing?.avatarUrl || '',
    provider: input.provider,
    githubId: input.githubId || existing?.githubId,
    createdAt: existing?.createdAt || now,
    lastLoginAt: now,
  }

  await redis.hset(KEY.authUser(userId), {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
    githubId: user.githubId ?? '',
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  })

  if (user.githubId) await redis.set(KEY.githubIndex(user.githubId), user.id)
  if (user.email) await redis.set(KEY.emailIndex(user.email.toLowerCase()), user.id)

  return user
}

/** 首次登录时给新用户写入默认习惯/目标，避免设置页出现空态 */
export async function ensureUserDefaults(userId: string): Promise<void> {
  const { getHabit, updateHabit } = await import('./habit')
  const habit = await getHabit(userId)
  if (!habit.createdAt) {
    await updateHabit(userId, habit)
  }
}
