import LoginForm from '@/components/LoginForm'
import { isProviderConfigured } from '@/lib/oauth'

export const dynamic = 'force-dynamic'

export const metadata = { title: '登录 · 打卡么' }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
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
        <span style={{ fontSize: 40, lineHeight: 1 }}>✅</span>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>打卡么</h1>
        <p className="hint">登录后即可开始打卡，数据只属于你。</p>
      </div>

      <LoginForm
        githubEnabled={isProviderConfigured('github')}
        devMode={devMode}
        next={next}
        error={params.error}
      />
    </div>
  )
}
