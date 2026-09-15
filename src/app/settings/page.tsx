import SetupNotice from '@/components/SetupNotice'
import SettingsForm from '@/components/SettingsForm'
import { getHabit } from '@/app/actions'
import { isAppConfigured } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  if (!isAppConfigured()) return <SetupNotice />

  const habit = await getHabit()

  return (
    <div style={{ display: 'grid', gap: 16, '--habit': habit.color } as React.CSSProperties}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>设置</h1>
        <p className="hint">改完立即生效，所有数据存在你的账号下。</p>
      </div>

      <SettingsForm habit={habit} />
    </div>
  )
}
