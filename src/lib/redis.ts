import { Redis } from '@upstash/redis'

/**
 * Redis 客户端（@upstash/redis，通过 REST API 连接，兼容 Upstash 及任何 Redis 兼容服务）。
 * 懒初始化：模块加载时不读环境变量，避免在构建期就抛错。
 */

let client: Redis | null = null

export function hasRedis(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  )
}

export function getRedis(): Redis {
  if (client) return client
  if (!hasRedis()) {
    throw new Error(
      'Redis 未配置：请在 .env.local 中设置 UPSTASH_REDIS_REST_URL 与 UPSTASH_REDIS_REST_TOKEN',
    )
  }
  client = Redis.fromEnv()
  return client
}

/** 所有 key 的统一定义。userId 均来自服务端会话，绝不接受客户端传入。 */
export const KEY = {
  user: (userId: string) => `dakame:user:${userId}`,
  checkin: (userId: string, yyyyMM: string) => `dakame:checkin:${userId}:${yyyyMM}`,
  goals: (userId: string) => `dakame:goals:${userId}`,
  learn: (userId: string, yyyyMM: string) => `dakame:learn:${userId}:${yyyyMM}`,
  learnAnswers: (userId: string) => `dakame:learn:answers:${userId}`,
  dailyLesson: (date: string) => `dakame:learn:daily:${date}`,

  // ---- 认证 ----
  authUser: (userId: string) => `dakame:auth:user:${userId}`,
  githubIndex: (githubId: string) => `dakame:auth:github:${githubId}`,
  emailIndex: (email: string) => `dakame:auth:email:${email}`,
  session: (tokenHash: string) => `dakame:auth:session:${tokenHash}`,
  userSessions: (userId: string) => `dakame:auth:sessions:${userId}`,
  otp: (email: string) => `dakame:auth:otp:${email}`,
} as const

/** 清除某位用户在 dakame 下的全部 key（清除数据用）。 */
export async function deleteUserKeys(userId: string): Promise<number> {
  const redis = getRedis()
  const pattern = `dakame:*:${userId}*`
  let cursor = 0
  let deleted = 0

  do {
    const [next, keys] = await redis.scan(cursor, { match: pattern, count: 200 })
    cursor = Number(next)
    if (keys.length > 0) {
      await redis.del(...keys)
      deleted += keys.length
    }
  } while (cursor !== 0)

  return deleted
}

/** 列出某位用户的所有 key（导出数据时用于定位 bitmap）。 */
export async function listUserKeys(userId: string): Promise<string[]> {
  const redis = getRedis()
  const pattern = `dakame:*:${userId}*`
  const all: string[] = []
  let cursor = 0

  do {
    const [next, keys] = await redis.scan(cursor, { match: pattern, count: 200 })
    cursor = Number(next)
    all.push(...keys)
  } while (cursor !== 0)

  return all
}
