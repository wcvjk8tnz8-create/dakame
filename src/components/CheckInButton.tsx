'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { toggleCheckIn } from '@/app/actions'

type Props = {
  date: string
  initialDone: boolean
  emoji: string
  name: string
}

export default function CheckInButton({ date, initialDone, emoji, name }: Props) {
  const router = useRouter()
  const [done, setDone] = useState(initialDone)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [pop, setPop] = useState(false)

  function onTap() {
    if (pending) return
    const next = !done

    // 乐观更新：点下去立刻有反馈
    setDone(next)
    setError(null)
    setPop(true)
    window.setTimeout(() => setPop(false), 300)

    startTransition(async () => {
      try {
        const result = await toggleCheckIn(date)
        setDone(result)
        router.refresh()
      } catch (e) {
        setDone(!next)
        setError(e instanceof Error ? e.message : '打卡失败，请重试')
      }
    })
  }

  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
      <button
        type="button"
        onClick={onTap}
        disabled={pending}
        aria-pressed={done}
        className={`checkin-ring ${pop ? 'pop' : ''}`}
        data-done={done}
        style={{ cursor: 'pointer' }}
      >
        <span style={{ fontSize: 34, lineHeight: 1 }}>{done ? '✓' : emoji}</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: done ? '#fff' : 'var(--color-text)' }}>
          {done ? '已完成' : '打卡'}
        </span>
        <span
          style={{
            fontSize: 11,
            opacity: 0.75,
            color: done ? '#fff' : 'var(--color-muted)',
          }}
        >
          {done ? `今天${name}已打卡` : `点一下完成${name}`}
        </span>
      </button>

      {error ? (
        <p className="hint" style={{ color: '#ff8080' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
