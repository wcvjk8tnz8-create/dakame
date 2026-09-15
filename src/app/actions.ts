'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { generateDailyLesson, gradeAnswer, isAIConfigured, currentProvider, PROVIDER_LABEL, currentModel } from '@/lib/ai'
import {
  getCheckIn,
  getMonthCheckIns as readMonthCheckIns,
  getMonthCount as readMonthCount,
  getStreak as readStreak,
  getWeekCheckIns as readWeekCheckIns,
  setCheckIn,
  toggleCheckIn as flipCheckIn,
  findCheckInMonths,
  listCheckInDates,
} from '@/lib/checkin'
import { fromISODate, isValidDateString, todayISO } from '@/lib/date'
import { getGoals as readGoals, getGoalProgress as readGoalProgress, updateGoals as writeGoals } from '@/lib/goals'
import { getHabit as readHabit, updateHabit as writeHabit } from '@/lib/habit'
import {
  countLearnDays,
  exportLearnAnswers,
  getDailyLesson as readDailyLesson,
  getLearnHistory as readLearnHistory,
  getLearnStatus,
  saveAnswer,
  setLearnStatus,
} from '@/lib/learn'
import { assertWriteAllowed, limitAI } from '@/lib/ratelimit'
import { deleteUserKeys } from '@/lib/redis'
import type { ActionState, GradeResult, Goals, Habit, Lesson, MonthCell } from '@/lib/types'

/**
 * 所有数据读写都经过 Server Actions。
 * userId 一律来自 Clerk 的 auth()，绝不接受客户端传入。
 */

async function requireUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  return userId
}

function revalidateAll() {
  revalidatePath('/')
  revalidatePath('/calendar')
  revalidatePath('/goals')
  revalidatePath('/learn')
  revalidatePath('/settings')
}

// ------------------------------------------------------------------ 习惯设置

export async function getHabit(): Promise<Habit> {
  return readHabit(await requireUserId())
}

export async function updateHabit(data: Partial<Habit>): Promise<Habit> {
  const userId = await requireUserId()
  await assertWriteAllowed(userId)
  const next = await writeHabit(userId, data)
  revalidateAll()
  return next
}

/** 设置页表单（useActionState） */
export async function saveHabitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const userId = await requireUserId()
    await assertWriteAllowed(userId)
    await writeHabit(userId, {
      name: String(formData.get('name') ?? ''),
      emoji: String(formData.get('emoji') ?? ''),
      color: String(formData.get('color') ?? ''),
      reminderTime: String(formData.get('reminderTime') ?? ''),
    })
    revalidateAll()
    return { ok: true, message: '已保存，立即生效' }
  } catch (error) {
    return { ok: false, message: errorMessage(error) }
  }
}

// -------------------------------------------------------------------- 打卡

export async function toggleCheckIn(date: string): Promise<boolean> {
  const userId = await requireUserId()
  if (!isValidDateString(date)) throw new Error('日期格式不正确')
  if (date > todayISO()) throw new Error('不能给未来打卡哦')
  await assertWriteAllowed(userId)
  const next = await flipCheckIn(userId, date)
  revalidateAll()
  return next
}

export async function getCheckInStatus(date: string): Promise<boolean> {
  const userId = await requireUserId()
  if (!isValidDateString(date)) return false
  return getCheckIn(userId, date)
}

export async function getMonthCheckIns(year: number, month: number): Promise<boolean[]> {
  const userId = await requireUserId()
  return readMonthCheckIns(userId, year, month)
}

/** 日历组件用：返回带补位格的月视图数据 */
export async function getMonthGrid(year: number, month: number): Promise<MonthCell[]> {
  const userId = await requireUserId()
  const states = await readMonthCheckIns(userId, year, month)
  const first = new Date(Date.UTC(year, month - 1, 1))
  const total = states.length
  const leading = (first.getUTCDay() + 6) % 7 // 周一为第一列
  const today = todayISO()

  const cells: MonthCell[] = []

  for (let i = 0; i < leading; i += 1) {
    const d = new Date(Date.UTC(year, month - 1, 1 - (leading - i)))
    const iso = d.toISOString().slice(0, 10)
    cells.push({ date: iso, day: d.getUTCDate(), done: false, isToday: false, isFuture: false, inMonth: false })
  }
  for (let i = 0; i < total; i += 1) {
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    cells.push({ date: iso, day: i + 1, done: states[i], isToday: iso === today, isFuture: iso > today, inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    const d = new Date(Date.UTC(year, month - 1, last.day + 1))
    const iso = d.toISOString().slice(0, 10)
    cells.push({ date: iso, day: d.getUTCDate(), done: false, isToday: false, isFuture: iso > today, inMonth: false })
  }

  return cells
}

export async function getMonthCount(year: number, month: number): Promise<number> {
  const userId = await requireUserId()
  return readMonthCount(userId, year, month)
}

export async function getStreak(): Promise<number> {
  return readStreak(await requireUserId())
}

export async function getWeekCheckIns() {
  return readWeekCheckIns(await requireUserId())
}

// -------------------------------------------------------------------- 目标

export async function getGoals(): Promise<Goals> {
  return readGoals(await requireUserId())
}

export async function getGoalProgress() {
  return readGoalProgress(await requireUserId())
}

export async function updateGoals(data: Partial<Goals>): Promise<Goals> {
  const userId = await requireUserId()
  await assertWriteAllowed(userId)
  const next = await writeGoals(userId, data)
  revalidateAll()
  return next
}

/** 目标页表单（useActionState） */
export async function saveGoalsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const userId = await requireUserId()
    await assertWriteAllowed(userId)
    await writeGoals(userId, {
      weeklyTarget: Number(formData.get('weeklyTarget') ?? 0),
      monthlyTarget: Number(formData.get('monthlyTarget') ?? 0),
      yearlyTarget: Number(formData.get('yearlyTarget') ?? 0),
    })
    revalidateAll()
    return { ok: true, message: '目标已更新' }
  } catch (error) {
    return { ok: false, message: errorMessage(error) }
  }
}

// ---------------------------------------------------------------- 英语补习

export async function getDailyLesson(): Promise<Lesson> {
  const userId = await requireUserId()
  const date = todayISO()
  const level = await countLearnDays(userId)
  return readDailyLesson(date, generateDailyLesson, level)
}

export async function getLearnStatusToday(): Promise<boolean> {
  const userId = await requireUserId()
  return getLearnStatus(userId, todayISO())
}

export async function getAIInfo(): Promise<{
  provider: string
  label: string
  model: string
  configured: boolean
}> {
  await requireUserId()
  const provider = currentProvider()
  return {
    provider,
    label: PROVIDER_LABEL[provider],
    model: currentModel(),
    configured: isAIConfigured(),
  }
}

export async function submitAnswer(answer: string): Promise<GradeResult> {
  const userId = await requireUserId()

  const raw = typeof answer === 'string' ? answer.trim() : ''
  if (raw.length === 0) {
    return { score: 0, correct: false, feedback: '请先写一个答案再提交 🙂', suggestion: '', source: 'fallback' }
  }
  if (raw.length > 500) {
    return { score: 0, correct: false, feedback: '答案太长了（最多 500 字）', suggestion: '', source: 'fallback' }
  }

  const ai = await limitAI(userId)
  if (!ai.success) {
    return {
      score: 0,
      correct: false,
      feedback: '今天的 AI 批改次数已用完（每天 30 次），明天再来～',
      suggestion: '',
      source: 'fallback',
    }
  }

  const date = todayISO()
  const level = await countLearnDays(userId)
  const lesson = await readDailyLesson(date, generateDailyLesson, level)
  const result = await gradeAnswer(lesson, raw)

  await saveAnswer(userId, date, lesson, raw, result)
  await setLearnStatus(userId, date, true)
  revalidatePath('/learn')
  revalidatePath('/')

  return result
}

export async function getLearnHistory() {
  return readLearnHistory(await requireUserId(), 7)
}

/** 学习完成后一键打卡（算作今天的主习惯打卡） */
export async function checkInFromLearn(): Promise<boolean> {
  const userId = await requireUserId()
  await assertWriteAllowed(userId)
  const next = await setCheckIn(userId, todayISO(), true)
  revalidateAll()
  return next
}

// ------------------------------------------------------------ 导出 / 清除

export async function exportData(): Promise<string> {
  const userId = await requireUserId()
  const [habit, goals, months, learnAnswers] = await Promise.all([
    readHabit(userId),
    readGoals(userId),
    findCheckInMonths(userId),
    exportLearnAnswers(userId),
  ])

  const checkIns: string[] = []
  for (const yyyyMM of months) {
    const year = Number(yyyyMM.slice(0, 4))
    const month = Number(yyyyMM.slice(4, 6))
    checkIns.push(...(await listCheckInDates(userId, year, month)))
  }

  return JSON.stringify(
    {
      app: '打卡么 / Dakame',
      exportedAt: new Date().toISOString(),
      timezone: process.env.APP_TIMEZONE || 'Asia/Shanghai',
      habit,
      goals,
      checkIns: checkIns.sort(),
      learn: learnAnswers,
    },
    null,
    2,
  )
}

export async function clearData(): Promise<boolean> {
  const userId = await requireUserId()
  await assertWriteAllowed(userId)
  await deleteUserKeys(userId)
  revalidateAll()
  return true
}

export async function clearDataAction(): Promise<ActionState> {
  try {
    await clearData()
    return { ok: true, message: '已清除全部数据' }
  } catch (error) {
    return { ok: false, message: errorMessage(error) }
  }
}

// ---------------------------------------------------------------- 工具

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return '出了点问题，请稍后再试'
}

/** 供页面做「今天」展示时对齐（保持导出/读取一致） */
export async function getToday(): Promise<string> {
  await requireUserId()
  return todayISO()
}

export async function getTodayParts(): Promise<{ year: number; month: number }> {
  await requireUserId()
  const d = fromISODate(todayISO())
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
}
