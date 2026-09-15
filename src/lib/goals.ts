import { fromISODate, todayISO, weekStart } from './date'
import { getRangeCount, getMonthCount, getYearCount } from './checkin'
import { getRedis, KEY } from './redis'
import type { Goals, GoalProgress } from './types'

/** 目标：weeklyTarget / monthlyTarget / yearlyTarget */

export const DEFAULT_GOALS: Goals = {
  weeklyTarget: 5,
  monthlyTarget: 20,
  yearlyTarget: 200,
  updatedAt: '',
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

function normalize(input: Partial<Goals> | null | undefined): Goals {
  const weekly = clamp(Math.round(Number(input?.weeklyTarget ?? DEFAULT_GOALS.weeklyTarget)) || 0, 0, 7)
  const monthly = clamp(Math.round(Number(input?.monthlyTarget ?? DEFAULT_GOALS.monthlyTarget)) || 0, 0, 31)
  const yearly = clamp(Math.round(Number(input?.yearlyTarget ?? DEFAULT_GOALS.yearlyTarget)) || 0, 0, 366)
  return {
    weeklyTarget: weekly,
    monthlyTarget: monthly,
    yearlyTarget: yearly,
    updatedAt: input?.updatedAt ?? '',
  }
}

export async function getGoals(userId: string): Promise<Goals> {
  const redis = getRedis()
  const raw = await redis.hgetall<Record<string, unknown>>(KEY.goals(userId))
  if (!raw || Object.keys(raw).length === 0) return { ...DEFAULT_GOALS }
  return normalize({
    weeklyTarget: Number(raw.weeklyTarget),
    monthlyTarget: Number(raw.monthlyTarget),
    yearlyTarget: Number(raw.yearlyTarget),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
  })
}

export async function updateGoals(userId: string, data: Partial<Goals>): Promise<Goals> {
  const redis = getRedis()
  const next = normalize(data)
  await redis.hset(KEY.goals(userId), {
    weeklyTarget: next.weeklyTarget,
    monthlyTarget: next.monthlyTarget,
    yearlyTarget: next.yearlyTarget,
    updatedAt: new Date().toISOString(),
  })
  return { ...next, updatedAt: new Date().toISOString() }
}

function percent(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

/** 周 / 月 / 年三项进度 */
export async function getGoalProgress(userId: string): Promise<GoalProgress> {
  const [goals, week, month, year] = await Promise.all([
    getGoals(userId),
    getRangeCount(userId, weekStart(todayISO()), todayISO()),
    (() => {
      const d = fromISODate(todayISO())
      return getMonthCount(userId, d.getUTCFullYear(), d.getUTCMonth() + 1)
    })(),
    getYearCount(userId, fromISODate(todayISO()).getUTCFullYear()),
  ])

  return [
    {
      kind: 'week',
      label: '本周',
      current: week,
      target: goals.weeklyTarget,
      percent: percent(week, goals.weeklyTarget),
      achieved: goals.weeklyTarget > 0 && week >= goals.weeklyTarget,
    },
    {
      kind: 'month',
      label: '本月',
      current: month,
      target: goals.monthlyTarget,
      percent: percent(month, goals.monthlyTarget),
      achieved: goals.monthlyTarget > 0 && month >= goals.monthlyTarget,
    },
    {
      kind: 'year',
      label: '今年',
      current: year,
      target: goals.yearlyTarget,
      percent: percent(year, goals.yearlyTarget),
      achieved: goals.yearlyTarget > 0 && year >= goals.yearlyTarget,
    },
  ]
}
