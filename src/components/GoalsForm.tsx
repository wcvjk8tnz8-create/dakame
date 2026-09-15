'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { saveGoalsAction } from '@/app/actions'
import type { ActionState, Goals } from '@/lib/types'

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? '保存中…' : '保存目标'}
    </button>
  )
}

export default function GoalsForm({ goals }: { goals: Goals }) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveGoalsAction, {
    ok: false,
    message: '',
  })

  return (
    <form action={formAction} className="card" style={{ display: 'grid', gap: 14 }}>
      <div>
        <label className="label" htmlFor="weeklyTarget">
          每周打卡目标（0-7 次）
        </label>
        <input
          id="weeklyTarget"
          name="weeklyTarget"
          type="number"
          min={0}
          max={7}
          className="input"
          defaultValue={goals.weeklyTarget}
        />
      </div>
      <div>
        <label className="label" htmlFor="monthlyTarget">
          每月打卡目标（0-31 次）
        </label>
        <input
          id="monthlyTarget"
          name="monthlyTarget"
          type="number"
          min={0}
          max={31}
          className="input"
          defaultValue={goals.monthlyTarget}
        />
      </div>
      <div>
        <label className="label" htmlFor="yearlyTarget">
          每年打卡目标（0-366 次）
        </label>
        <input
          id="yearlyTarget"
          name="yearlyTarget"
          type="number"
          min={0}
          max={366}
          className="input"
          defaultValue={goals.yearlyTarget}
        />
      </div>

      <SaveButton />

      {state.message ? (
        <p className="hint" style={{ color: state.ok ? '#4ade80' : '#ff8080' }}>
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
