'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { clearDataAction, exportData, saveHabitAction } from '@/app/actions'
import { SPONSOR_URL } from '@/lib/env'
import type { ActionState, Habit } from '@/lib/types'

const EMOJIS = ['💧', '🏃', '📚', '🧘', '💪', '🌙', '🥗', '✍️', '🎸', '🚭']
const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#a855f7']

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? '保存中…' : '保存设置'}
    </button>
  )
}

export default function SettingsForm({ habit }: { habit: Habit }) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveHabitAction, {
    ok: false,
    message: '',
  })
  const [color, setColor] = useState(habit.color)
  const [emoji, setEmoji] = useState(habit.emoji)
  const [cleared, setCleared] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--habit', color)
  }, [color])

  async function onExport() {
    setBusy(true)
    try {
      const json = await exportData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dakame-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  async function onClear() {
    const ok = window.confirm('确定要清除所有数据吗？此操作不可恢复。')
    if (!ok) return
    const ok2 = window.confirm('再次确认：打卡记录、目标、学习记录都会被删除。')
    if (!ok2) return
    setBusy(true)
    const res = await clearDataAction()
    setCleared(res.ok)
    setBusy(false)
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <form action={formAction} className="card" style={{ display: 'grid', gap: 14 }}>
        <div>
          <label className="label" htmlFor="name">
            习惯名称
          </label>
          <input
            id="name"
            name="name"
            className="input"
            defaultValue={habit.name}
            maxLength={20}
            required
          />
        </div>

        <div>
          <span className="label">Emoji</span>
          <input type="hidden" name="emoji" value={emoji} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  fontSize: 19,
                  border: emoji === e ? '2px solid var(--habit)' : '1px solid var(--color-line)',
                  background: 'var(--color-card-2)',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">颜色</span>
          <input type="hidden" name="color" value={color} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: c,
                  border: color === c ? '3px solid #fff' : '2px solid transparent',
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="reminderTime">
            提醒时间（可选）
          </label>
          <input
            id="reminderTime"
            name="reminderTime"
            type="time"
            className="input"
            defaultValue={habit.reminderTime}
          />
          <p className="hint" style={{ marginTop: 6 }}>
            提醒依赖浏览器通知，需要把本页面添加到主屏幕后授权（TODO：接入 Web Push）。
          </p>
        </div>

        <SaveButton />

        {state.message ? (
          <p className="hint" style={{ color: state.ok ? '#4ade80' : '#ff8080' }}>
            {state.message}
          </p>
        ) : null}
      </form>

      <div className="card" style={{ display: 'grid', gap: 10 }}>
        <div className="card-title">数据</div>
        <button className="btn" onClick={onExport} disabled={busy}>
          导出数据为 JSON
        </button>
        <button className="btn btn-danger" onClick={onClear} disabled={busy}>
          清除所有数据
        </button>
        {cleared ? <p className="hint" style={{ color: '#4ade80' }}>已清除全部数据</p> : null}
      </div>

      <div className="card" style={{ display: 'grid', gap: 8 }}>
        <div className="card-title">安装到主屏幕</div>
        <p className="hint">
          iPhone：Safari → 分享 → 「添加到主屏幕」。
          <br />
          Android：Chrome → 菜单 → 「安装应用」。
          <br />
          安装后可离线打开，联网自动同步。
        </p>
        <a className="btn" href={SPONSOR_URL} target="_blank" rel="noreferrer">
          赞助这个项目 ☕
        </a>
      </div>
    </div>
  )
}
