import CalendarGrid from '@/components/CalendarGrid'
import SetupNotice from '@/components/SetupNotice'
import { getHabit, getMonthGrid } from '@/app/actions'
import { requireUser } from '@/lib/auth'
import { fromISODate, todayISO } from '@/lib/date'
import { isAppConfigured } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  // 未登录会在 requireUser 里跳登录页
  await requireUser()

  if (!isAppConfigured()) return <SetupNotice />

  const habit = await getHabit()
  const today = fromISODate(todayISO())
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth() + 1
  const cells = await getMonthGrid(year, month)

  return (
    <div style={{ display: 'grid', gap: 16, '--habit': habit.color } as React.CSSProperties}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>日历</h1>
        <p className="hint">{habit.emoji} {habit.name} · 点击过去日期可补卡</p>
      </div>

      <div className="card">
        <CalendarGrid initialYear={year} initialMonth={month} initialCells={cells} />
      </div>
    </div>
  )
}
