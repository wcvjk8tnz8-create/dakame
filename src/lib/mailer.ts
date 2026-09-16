import { randomInt } from 'node:crypto'

import { getRedis, KEY } from './redis'

/**
 * 邮箱验证码登录（OTP）。
 * 邮件发送走 Resend REST API（零额外依赖）；未配置时，开发环境把验证码打印到服务端日志。
 */

const OTP_TTL_SECONDS = 10 * 60
const MAX_ATTEMPTS = 5

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type OtpRecord = {
  code: string
  attempts: number
  createdAt: string
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** 发送验证码，写入 Redis（10 分钟有效，最多试 5 次） */
export async function sendOtp(email: string): Promise<{ ok: boolean; message: string }> {
  const normalized = email.trim().toLowerCase()
  if (!EMAIL_RE.test(normalized)) {
    return { ok: false, message: '邮箱格式不正确' }
  }

  const code = generateCode()
  const redis = getRedis()
  const record: OtpRecord = {
    code,
    attempts: 0,
    createdAt: new Date().toISOString(),
  }
  await redis.set(KEY.otp(normalized), JSON.stringify(record), { ex: OTP_TTL_SECONDS })

  if (isMailConfigured()) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY as string}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: normalized,
        subject: '打卡么登录验证码',
        text: `你的打卡么登录验证码是 ${code}，10 分钟内有效。\n\n如果不是你本人操作，忽略这封邮件即可。`,
      }),
      cache: 'no-store',
    })
    if (!res.ok) {
      return { ok: false, message: '邮件发送失败，请检查 Resend 配置' }
    }
    return { ok: true, message: '验证码已发送，请查收邮件' }
  }

  if (process.env.NODE_ENV !== 'production') {
    // 开发环境：直接把验证码打在服务端控制台，方便本地调试
    console.log(`[dakame] 登录验证码 ${normalized} → ${code}`)
    return { ok: true, message: `开发环境：验证码已输出到服务端控制台（${code}）` }
  }

  return { ok: false, message: '邮件服务未配置（需要 RESEND_API_KEY 与 EMAIL_FROM）' }
}

/** 校验验证码 */
export async function verifyOtp(
  email: string,
  input: string,
): Promise<{ ok: boolean; message: string }> {
  const normalized = email.trim().toLowerCase()
  const code = input.trim()

  if (!EMAIL_RE.test(normalized) || !/^\d{6}$/.test(code)) {
    return { ok: false, message: '邮箱或验证码格式不正确' }
  }

  const redis = getRedis()
  const raw = await redis.get<OtpRecord | string>(KEY.otp(normalized))
  if (!raw) return { ok: false, message: '验证码已过期，请重新获取' }

  const record: OtpRecord = typeof raw === 'string' ? (JSON.parse(raw) as OtpRecord) : raw

  if (record.attempts >= MAX_ATTEMPTS) {
    await redis.del(KEY.otp(normalized))
    return { ok: false, message: '尝试次数过多，请重新获取验证码' }
  }

  if (record.code !== code) {
    await redis.set(
      KEY.otp(normalized),
      JSON.stringify({ ...record, attempts: record.attempts + 1 }),
      { ex: OTP_TTL_SECONDS },
    )
    return { ok: false, message: `验证码不正确，还可试 ${MAX_ATTEMPTS - record.attempts - 1} 次` }
  }

  await redis.del(KEY.otp(normalized))
  return { ok: true, message: '验证通过' }
}
