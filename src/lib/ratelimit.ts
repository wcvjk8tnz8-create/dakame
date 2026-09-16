import { Ratelimit } from '@upstash/ratelimit'
import { getRedis, hasRedis } from './redis'

/**
 * 限流：
 *  - 写操作（打卡 / 改设置 / 改目标）：每个 userId 每分钟 10 次
 *  - AI 调用：每个 userId 每天 30 次
 * Redis 未配置时（本地无环境变量）自动跳过，不阻塞开发。
 */

let writeLimiter: Ratelimit | null = null
let aiLimiter: Ratelimit | null = null
let emailLimiter: Ratelimit | null = null

function getWriteLimiter(): Ratelimit | null {
  if (!hasRedis()) return null
  if (!writeLimiter) {
    writeLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      prefix: 'dakame:rl:write',
      analytics: false,
    })
  }
  return writeLimiter
}

function getAILimiter(): Ratelimit | null {
  if (!hasRedis()) return null
  if (!aiLimiter) {
    aiLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(30, '1 d'),
      prefix: 'dakame:rl:ai',
      analytics: false,
    })
  }
  return aiLimiter
}

export type LimitResult = { success: boolean; remaining: number }

export async function limitWrite(userId: string): Promise<LimitResult> {
  const limiter = getWriteLimiter()
  if (!limiter) return { success: true, remaining: 999 }
  const res = await limiter.limit(userId)
  return { success: res.success, remaining: res.remaining }
}

export async function limitAI(userId: string): Promise<LimitResult> {
  const limiter = getAILimiter()
  if (!limiter) return { success: true, remaining: 999 }
  const res = await limiter.limit(userId)
  return { success: res.success, remaining: res.remaining }
}

export class RateLimitError extends Error {
  constructor(message = '操作太频繁了，请稍后再试') {
    super(message)
    this.name = 'RateLimitError'
  }
}

/** 邮箱验证码发送：每个邮箱每 10 分钟 5 次 */
function getEmailLimiter(): Ratelimit | null {
  if (!hasRedis()) return null
  if (!emailLimiter) {
    emailLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, '10 m'),
      prefix: 'dakame:rl:email',
      analytics: false,
    })
  }
  return emailLimiter
}

export async function limitEmail(email: string): Promise<LimitResult> {
  const limiter = getEmailLimiter()
  if (!limiter) return { success: true, remaining: 999 }
  const res = await limiter.limit(email.toLowerCase())
  return { success: res.success, remaining: res.remaining }
}

/** 写操作统一守卫 */
export async function assertWriteAllowed(userId: string): Promise<void> {
  const res = await limitWrite(userId)
  if (!res.success) throw new RateLimitError()
}
