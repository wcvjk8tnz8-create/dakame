/** 共享类型定义（'use server' 文件只能导出 async 函数，类型统一放这里） */

export type Habit = {
  name: string
  emoji: string
  color: string
  reminderTime: string
  createdAt: string
}

export type Goals = {
  weeklyTarget: number
  monthlyTarget: number
  yearlyTarget: number
  updatedAt: string
}

export type GoalKind = 'week' | 'month' | 'year'

export type GoalProgressItem = {
  kind: GoalKind
  label: string
  current: number
  target: number
  percent: number
  achieved: boolean
}

export type GoalProgress = GoalProgressItem[]

export type LessonType = 'translate' | 'fill-blank' | 'word' | 'dialogue'

export type Lesson = {
  type: LessonType
  question: string
  hint: string
  referenceAnswer: string
  /** 由哪个来源产生：AI 还是内置题库兜底 */
  source: 'ai' | 'fallback'
}

export type GradeResult = {
  score: number
  correct: boolean
  feedback: string
  suggestion: string
  source: 'ai' | 'fallback'
}

export type LearnRecord = {
  date: string
  lesson: Lesson | null
  answer: string
  result: GradeResult | null
  done: boolean
}

export type WeekDot = {
  date: string
  label: string
  done: boolean
  isToday: boolean
  isFuture: boolean
}

export type MonthCell = {
  date: string
  day: number
  done: boolean
  isToday: boolean
  isFuture: boolean
  inMonth: boolean
}

export type ActionState = {
  ok: boolean
  message: string
}
