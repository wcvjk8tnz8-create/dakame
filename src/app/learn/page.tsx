import { History, Sparkles } from 'lucide-react'
import Link from 'next/link'

import AnswerForm from '@/components/AnswerForm'
import LessonCard from '@/components/LessonCard'
import SetupNotice from '@/components/SetupNotice'
import {
  getAIInfo,
  getDailyLesson,
  getHabit,
  getLearnHistory,
  getLearnStatusToday,
} from '@/app/actions'
import { todayISO } from '@/lib/date'
import { isAppConfigured } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function LearnPage() {
  if (!isAppConfigured()) return <SetupNotice />

  const [habit, lesson, history, done, ai] = await Promise.all([
    getHabit(),
    getDailyLesson(),
    getLearnHistory(),
    getLearnStatusToday(),
    getAIInfo(),
  ])

  const today = todayISO()
  const todayRecord = history.find((h) => h.date === today)

  return (
    <div
      style={
        {
          display: 'grid',
          gap: 16,
          '--habit': habit.color,
        } as React.CSSProperties
      }
    >
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>英语补习</h1>
        <p className="hint">每天一道小题，30 秒完成，AI 即时批改。</p>
      </div>

      <div
        className="card"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px' }}
      >
        <span className="hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} />
          当前 AI 提供商
        </span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {ai.label}
          <span className="hint" style={{ fontWeight: 400 }}>
            {' '}
            · {ai.model}
          </span>
        </span>
      </div>

      {!ai.configured ? (
        <div className="card" style={{ borderColor: '#5a4a1e' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            AI 未配置，当前使用内置题库
          </div>
          <p className="hint">
            在 <code>.env.local</code> 填写 <code>CLOUDFLARE_ACCOUNT_ID</code> 与
            <code> CLOUDFLARE_AI_API_TOKEN</code>（或切换到 openai / anthropic）后重启即可启用 AI。
          </p>
        </div>
      ) : null}

      <LessonCard lesson={lesson} providerLabel={ai.label} />

      <AnswerForm
        lesson={lesson}
        initialAnswer={todayRecord?.answer ?? ''}
        initialResult={todayRecord?.result ?? null}
      />

      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <div className="card-title">
          <History size={14} /> 最近 7 天
          {done ? (
            <span style={{ marginLeft: 'auto', color: 'var(--habit)', fontWeight: 700 }}>
              今天已完成 ✓
            </span>
          ) : null}
        </div>

        <ul style={{ display: 'grid', gap: 8 }}>
          {history.map((h) => (
            <li
              key={h.date}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 11px',
                borderRadius: 12,
                background: '#0f0f18',
                border: '1px solid var(--color-line)',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: h.done ? 'var(--habit)' : 'var(--color-line)',
                  flexShrink: 0,
                }}
              />
              <span className="hint" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {h.date}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600 }}>
                {h.result ? `${h.result.score} 分` : '未完成'}
              </span>
            </li>
          ))}
        </ul>

        <Link href="/" className="hint" style={{ textAlign: 'center' }}>
          英语任务完成后可一键计入今日打卡 →
        </Link>
      </div>
    </div>
  )
}
