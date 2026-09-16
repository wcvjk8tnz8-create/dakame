'use client'

import { Github, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'

import {
  devLoginAction,
  sendCodeAction,
  verifyCodeAction,
  type EmailState,
} from '@/app/email-actions'

const EMPTY: EmailState = { ok: false, message: '' }

const ERROR_TEXT: Record<string, string> = {
  github_not_configured: 'GitHub 登录未配置（缺少 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET）',
  state_mismatch: '登录状态校验失败，请重试',
  oauth_failed: 'GitHub 授权失败，请重试',
  dev_login_disabled: '生产环境不支持快捷登录',
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn-primary" disabled={pending} style={{ width: '100%' }}>
      {pending ? <Loader2 size={16} className="animate-spin" /> : null}
      {pending ? '处理中…' : label}
    </button>
  )
}

export default function LoginForm({
  githubEnabled,
  devMode,
  next,
  error,
}: {
  githubEnabled: boolean
  devMode: boolean
  next: string
  error?: string
}) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [sendState, sendAction] = useActionState<EmailState, FormData>(sendCodeAction, EMPTY)
  const [verifyState, verifyAction] = useActionState<EmailState, FormData>(
    verifyCodeAction,
    EMPTY,
  )

  // 验证码发送成功后切到第二步
  useEffect(() => {
    if (sendState.sent) setStep('code')
  }, [sendState.sent, sendState.message])

  return (
    <div style={{ display: 'grid', gap: 14, width: '100%', maxWidth: 360 }}>
      {error ? (
        <div className="card" style={{ borderColor: '#5b2a2a', padding: '10px 12px' }}>
          <p className="hint" style={{ color: '#ff8080' }}>
            {ERROR_TEXT[error] ?? '登录失败，请重试'}
          </p>
        </div>
      ) : null}

      {githubEnabled ? (
        <a className="btn btn-primary" href={`/api/auth/github?next=${encodeURIComponent(next)}`}>
          <Github size={17} /> 使用 GitHub 登录
        </a>
      ) : (
        <div className="card" style={{ padding: '10px 12px', borderColor: '#5a4a1e' }}>
          <p className="hint">
            GitHub 登录未启用：在 <code>.env.local</code> 配置 <code>GITHUB_CLIENT_ID</code> 与
            <code> GITHUB_CLIENT_SECRET</code> 后重启即可。
          </p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ flex: 1, height: 1, background: 'var(--color-line)' }} />
        <span className="hint">或用邮箱</span>
        <span style={{ flex: 1, height: 1, background: 'var(--color-line)' }} />
      </div>

      {step === 'email' ? (
        <form action={sendAction} style={{ display: 'grid', gap: 10 }}>
          <input type="hidden" name="next" value={next} />
          <input
            className="input"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <SubmitButton label="发送验证码" />
          {sendState.message && !sendState.ok ? (
            <p className="hint" style={{ color: '#ff8080' }}>
              {sendState.message}
            </p>
          ) : null}
        </form>
      ) : (
        <form action={verifyAction} style={{ display: 'grid', gap: 10 }}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next} />
          <input
            className="input"
            type="text"
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="6 位验证码"
            required
            autoComplete="one-time-code"
            style={{ letterSpacing: 6, textAlign: 'center', fontSize: 18 }}
          />
          <SubmitButton label="登录" />
          {sendState.devCode ? (
            <p className="hint">开发环境验证码：{sendState.devCode}</p>
          ) : null}
          {verifyState.message ? (
            <p className="hint" style={{ color: verifyState.ok ? '#4ade80' : '#ff8080' }}>
              {verifyState.message}
            </p>
          ) : null}
          <button
            type="button"
            className="hint"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setStep('email')}
          >
            换个邮箱 / 重新发送
          </button>
        </form>
      )}

      {devMode ? (
        <form action={devLoginAction}>
          <button className="btn" type="submit" style={{ width: '100%' }}>
            本地开发快捷登录
          </button>
        </form>
      ) : null}

      <p className="hint" style={{ textAlign: 'center' }}>
        还没有账号？<Link href="/sign-up" style={{ color: 'var(--habit)' }}>注册一个</Link>
      </p>
    </div>
  )
}
