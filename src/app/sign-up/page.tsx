import Link from 'next/link'

import LoginForm from '@/components/LoginForm'
import { isProviderConfigured } from '@/lib/oauth'

export const dynamic = 'force-dynamic'

export const metadata = { title: '注册 · 打卡么' }

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  const next = params.next && params.next.startsWith('/') ? params.next : '/'
  const devMode = process.env.NODE_ENV !== 'production'

  return (
    <div
      style={{
        display: 'grid',
        gap: 20,
        paddingTop: 40,
        justifyItems: 'center',
        minHeight: '70dvh',
        alignContent: 'center',
      }}
    >
      <div style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 40, lineHeight: 1 }}>🌱</span>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>创建账号</h1>
        <p className="hint">选一种方式即可，不需要密码。</p>
      </div>

      <LoginForm
        githubEnabled={isProviderConfigured('github')}
        devMode={devMode}
        next={next}
      />

      <p className="hint" style={{ textAlign: 'center' }}>
        已有账号？<Link href="/sign-in" style={{ color: 'var(--habit)' }}>去登录</Link>
      </p>
    </div>
  )
}
