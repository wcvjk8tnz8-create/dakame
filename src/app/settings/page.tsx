import SetupNotice from '@/components/SetupNotice'
import SettingsForm from '@/components/SettingsForm'
import { getHabit } from '@/app/actions'
import { signOutAction } from '@/app/auth-actions'
import { requireUser } from '@/lib/auth'
import { isAppConfigured } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await requireUser()

  if (!isAppConfigured()) return <SetupNotice />

  const habit = await getHabit()

  return (
    <div style={{ display: 'grid', gap: 16, '--habit': habit.color } as React.CSSProperties}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>设置</h1>
        <p className="hint">改完立即生效，所有数据存在你的账号下。</p>
      </div>

      <SettingsForm habit={habit} />

      <AccountCard email={user.email} name={user.name} provider={user.provider} />
    </div>
  )
}

const PROVIDER_LABEL: Record<string, string> = {
  github: 'GitHub',
  email: '邮箱验证码',
  dev: '本地开发',
}

function AccountCard({
  email,
  name,
  provider,
}: {
  email: string
  name: string
  provider: string
}) {
  return (
    <div className="card" style={{ display: 'grid', gap: 8 }}>
      <div className="card-title">账号</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
      <div className="hint" style={{ wordBreak: 'break-all' }}>
        {email}
      </div>
      <div className="hint">登录方式：{PROVIDER_LABEL[provider] ?? provider}</div>
      <form action={signOutAction}>
        <button className="btn" type="submit" style={{ width: '100%' }}>
          退出登录
        </button>
      </form>
    </div>
  )
}
