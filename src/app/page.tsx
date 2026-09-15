import { UserButton } from '@clerk/nextjs'
import { Flame, Heart } from 'lucide-react'
import Link from 'next/link'

import CheckInButton from '@/components/CheckInButton'
import GoalProgress from '@/components/GoalProgress'
import SetupNotice from '@/components/SetupNotice'
import WeekDots from '@/components/WeekDots'
import {
  getCheckInStatus,
  getGoalProgress,
  getHabit,
  getStreak,
  getWeekCheckIns,
} from '@/app/actions'
import { prettyDate, todayISO } from '@/lib/date'
import { isAppConfigured, SPONSOR_URL } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  if (!isAppConfigured()) {
    return (
      <>
        <TopBar />
        <SetupNotice />
      </>
    )
  }

  const today = todayISO()
  const [habit, done, streak, week, progress] = await Promise.all([
    getHabit(),
    getCheckInStatus(today),
    getStreak(),
    getWeekCheckIns(),
    getGoalProgress(),
  ])

  return (
    <div
      style={{ display: 'grid', gap: 18, '--habit': habit.color } as React.CSSProperties}
    >
      <TopBar date={prettyDate(today)} />

      <div style={{ display: 'grid', justifyItems: 'center', gap: 14, paddingTop: 6 }}>
        <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 40, lineHeight: 1 }}>{habit.emoji}</span>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>{habit.name}</h1>
        </div>

        <CheckInButton date={today} initialDone={done} emoji={habit.emoji} name={habit.name} />

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--habit)',
          }}
        >
          <Flame size={16} />
          连续 {streak} 天
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gap: 12 }}>
        <div className="card-title">本周</div>
        <WeekDots dots={week} />
      </div>

      <div className="card" style={{ display: 'grid', gap: 14 }}>
        <div className="card-title">目标进度</div>
        <GoalProgress progress={progress} />
      </div>
    </div>
  )
}

function TopBar({ date }: { date?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>打卡么</div>
        {date ? <div className="hint">{date}</div> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link
          href={SPONSOR_URL}
          target="_blank"
          aria-label="赞助"
          style={{ color: 'var(--color-muted)', display: 'inline-flex' }}
        >
          <Heart size={18} />
        </Link>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </div>
  )
}
