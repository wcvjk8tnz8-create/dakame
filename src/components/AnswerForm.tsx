'use client'

import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { checkInFromLearn, submitAnswer } from '@/app/actions'
import type { GradeResult, Lesson } from '@/lib/types'

export default function AnswerForm({
  lesson,
  initialAnswer,
  initialResult,
}: {
  lesson: Lesson
  initialAnswer: string
  initialResult: GradeResult | null
}) {
  const router = useRouter()
  const [answer, setAnswer] = useState(initialAnswer)
  const [result, setResult] = useState<GradeResult | null>(initialResult)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [checkedIn, setCheckedIn] = useState(false)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pending || answer.trim().length === 0) return
    setError(null)

    startTransition(async () => {
      try {
        const res = await submitAnswer(answer)
        setResult(res)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '提交失败，请重试')
      }
    })
  }

  function onCheckIn() {
    startTransition(async () => {
      try {
        await checkInFromLearn()
        setCheckedIn(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : '打卡失败')
      }
    })
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        <textarea
          className="input"
          rows={4}
          maxLength={500}
          placeholder="写下你的答案…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          style={{ resize: 'vertical', lineHeight: 1.6 }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="hint">{answer.length} / 500</span>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending || answer.trim().length === 0}
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            提交批改
          </button>
        </div>
      </form>

      {error ? (
        <p className="hint" style={{ color: '#ff8080' }}>
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="card" style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: result.correct ? '#4ade80' : 'var(--habit)',
              }}
            >
              {result.score}
            </span>
            <span className="hint">分 / 100</span>
            {result.correct ? (
              <span
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  color: '#4ade80',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={15} /> 通过
              </span>
            ) : null}
          </div>

          <div style={{ fontSize: 14, lineHeight: 1.7 }}>{result.feedback}</div>

          {result.suggestion ? (
            <div
              className="hint"
              style={{ background: '#0f0f18', borderRadius: 12, padding: '9px 11px' }}
            >
              {result.suggestion}
            </div>
          ) : null}

          <button className="btn" onClick={onCheckIn} disabled={pending || checkedIn}>
            {checkedIn ? '今天已打卡 ✓' : '一键打卡（算作今日打卡）'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
