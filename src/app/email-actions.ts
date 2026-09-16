'use server'

import { redirect } from 'next/navigation'

import {
  createSession,
  ensureUserDefaults,
  upsertUser,
} from '@/lib/auth'
import { EMAIL_RE } from '@/lib/mailer'
import { limitEmail } from '@/lib/ratelimit'

export type EmailState = {
  ok: boolean
  message: string
  /** 是否已发送验证码（切到输入验证码步骤） */
  sent?: boolean
  /** 开发环境回填，省得看日志 */
  devCode?: string
}

function detectDevCode(message: string): string | undefined {
  const m = message.match(/（(\d{6})）/)
  return m?.[1]
}

/** 第一步：发送验证码 */
export async function sendCodeAction(
  _prev: EmailState,
  formData: FormData,
): Promise<EmailState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()

  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: '请输入有效的邮箱地址' }
  }

  const allowed = await limitEmail(email)
  if (!allowed.success) {
    return { ok: false, message: '发送太频繁了，请稍后再试' }
  }

  const { sendOtp } = await import('@/lib/mailer')
  const res = await sendOtp(email)
  if (!res.ok) return { ok: false, message: res.message }

  return {
    ok: true,
    message: res.message,
    sent: true,
    devCode: detectDevCode(res.message),
  }
}

/** 第二步：校验验证码并登录 */
export async function verifyCodeAction(
  _prev: EmailState,
  formData: FormData,
): Promise<EmailState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const code = String(formData.get('code') ?? '').trim()
  const next = String(formData.get('next') ?? '/')

  const { verifyOtp } = await import('@/lib/mailer')
  const res = await verifyOtp(email, code)
  if (!res.ok) return { ok: false, message: res.message, sent: true }

  const user = await upsertUser({ email, provider: 'email' })
  await ensureUserDefaults(user.id)
  await createSession(user.id)

  redirect(next.startsWith('/') ? next : '/')
}

/** 仅开发环境：一键登录测试账号 */
export async function devLoginAction(_formData?: FormData): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    redirect('/sign-in?error=dev_login_disabled')
  }

  const user = await upsertUser({
    email: 'dev@dakame.local',
    name: '本地开发账号',
    provider: 'dev',
  })
  await ensureUserDefaults(user.id)
  await createSession(user.id)
  redirect('/')
}
