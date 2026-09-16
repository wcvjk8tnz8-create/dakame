import GoalProgress from '@/components/GoalProgress'
import GoalsForm from '@/components/GoalsForm'
import SetupNotice from '@/components/SetupNotice'
import { getGoalProgress, getGoals, getHabit } from '@/app/actions'
import { requireUser } from '@/lib/auth'
import { isAppConfigured } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  // 未登录会在 requireUser 里跳登录页
  await requireUser()

  if (!isAppConfigured()) return <SetupNotice />

  const [habit, goals, progress] = await Promise.all([
    getHabit(),
    getGoals(),
    getGoalProgress(),
  ])

  return (
    <div style={{ display: 'grid', gap: 16, '--habit': habit.color } as React.CSSProperties}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>目标</h1>
        <p className="hint">给 {habit.name} 定三个小目标，看得见进度才坚持得下去。</p>
      </div>

      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <div className="card-title">当前进度</div>
        <GoalProgress progress={progress} />
      </div>

      <GoalsForm goals={goals} />
    </div>
  )
}
