'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'

import { getMonthGrid, toggleCheckIn } from '@/app/actions'
import { WEEK_LABELS } from '@/lib/date'
import type { MonthCell } from '@/lib/types'

type Props = {
  initialYear: number
  initialMonth: number
  initialCells: MonthCell[]
}

export default function CalendarGrid({ initialYear, initialMonth, initialCells }: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [cells, setCells] = useState<MonthCell[]>(initialCells)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const doneCount = useMemo(
    () => cells.filter((c) => c.inMonth && c.done).length,
    [cells],
  )

  function goto(delta: number) {
    let y = year
    let m = month + delta
    if (m < 1) {
      m = 12
      y -= 1
    } else if (m > 12) {
      m = 1
      y += 1
    }
    startTransition(async () => {
      const next = await getMonthGrid(y, m)
      setYear(y)
      setMonth(m)
      setCells(next)
    })
  }

  function onTap(cell: MonthCell) {
    if (!cell.inMonth || cell.isFuture || pending) return
    const date = cell.date
    const wasDone = cell.done

    // 乐观更新
    setCells((prev) =>
      prev.map((c) => (c.date === date ? { ...c, done: !wasDone } : c)),
    )
    setError(null)

    startTransition(async () => {
      try {
        await toggleCheckIn(date)
        setCells(await getMonthGrid(year, month))
      } catch (e) {
        setCells((prev) =>
          prev.map((c) => (c.date === date ? { ...c, done: wasDone } : c)),
        )
        setError(e instanceof Error ? e.message : '更新失败')
      }
    })
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn" style={{ padding: '8px 10px' }} onClick={() => goto(-1)} aria-label="上个月">
          <ChevronLeft size={18} />
        </button>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {year} 年 {month} 月
        </div>
        <button className="btn" style={{ padding: '8px 10px' }} onClick={() => goto(1)} aria-label="下个月">
          <ChevronRight size={18} />
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
          opacity: pending ? 0.7 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {WEEK_LABELS.map((w) => (
          <div key={w} className="hint" style={{ textAlign: 'center', fontSize: 11 }}>
            {w}
          </div>
        ))}

        {cells.map((cell) => (
          <button
            key={cell.date}
            type="button"
            disabled={!cell.inMonth || cell.isFuture}
            onClick={() => onTap(cell)}
            style={{
              aspectRatio: '1 / 1',
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              fontSize: 13,
              fontWeight: 600,
              border: cell.isToday ? '2px solid var(--habit)' : '1px solid var(--color-line)',
              background: cell.done ? 'var(--habit)' : 'transparent',
              color: cell.done ? '#fff' : cell.inMonth ? 'var(--color-text)' : '#3a3a52',
              opacity: cell.isFuture && cell.inMonth ? 0.35 : 1,
              cursor: cell.inMonth && !cell.isFuture ? 'pointer' : 'default',
            }}
          >
            {cell.day}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="hint">本月已打卡</span>
        <span style={{ fontSize: 20, fontWeight: 700 }}>
          {doneCount}
          <span className="hint" style={{ fontSize: 12, fontWeight: 400 }}>
            {' '}
            天
          </span>
        </span>
      </div>

      {error ? (
        <p className="hint" style={{ color: '#ff8080' }}>
          {error}
        </p>
      ) : null}

      <p className="hint">💡 点击过去的日期可以补卡或取消补卡，数据实时写入 Redis。</p>
    </div>
  )
}
