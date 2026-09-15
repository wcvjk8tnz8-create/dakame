import { getRedis, KEY } from './redis'
import type { Habit } from './types'

/** 习惯设置：dakame:user:{userId} → Hash */

export const DEFAULT_HABIT: Habit = {
  name: '喝水',
  emoji: '💧',
  color: '#6366f1',
  reminderTime: '',
  createdAt: '',
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

function sanitize(input: Partial<Habit> | null | undefined): Habit {
  const name = (input?.name ?? '').toString().trim().slice(0, 20) || DEFAULT_HABIT.name
  const emoji = (input?.emoji ?? '').toString().trim().slice(0, 8) || DEFAULT_HABIT.emoji
  const colorRaw = (input?.color ?? '').toString().trim()
  const color = HEX_RE.test(colorRaw) ? colorRaw : DEFAULT_HABIT.color
  const reminderRaw = (input?.reminderTime ?? '').toString().trim()
  const reminderTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(reminderRaw) ? reminderRaw : ''

  return {
    name,
    emoji,
    color,
    reminderTime,
    createdAt: input?.createdAt ?? '',
  }
}

export async function getHabit(userId: string): Promise<Habit> {
  const redis = getRedis()
  const raw = await redis.hgetall<Record<string, unknown>>(KEY.user(userId))
  if (!raw || Object.keys(raw).length === 0) {
    return { ...DEFAULT_HABIT }
  }

  const habit = sanitize({
    name: typeof raw.name === 'string' ? raw.name : undefined,
    emoji: typeof raw.emoji === 'string' ? raw.emoji : undefined,
    color: typeof raw.color === 'string' ? raw.color : undefined,
    reminderTime: typeof raw.reminderTime === 'string' ? raw.reminderTime : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
  })

  // 首次读取时写入默认值，保证 createdAt 稳定
  if (!raw.createdAt) {
    await redis.hset(KEY.user(userId), { ...habit, createdAt: new Date().toISOString() })
  }

  return habit
}

export async function updateHabit(userId: string, data: Partial<Habit>): Promise<Habit> {
  const redis = getRedis()
  const current = await getHabit(userId)
  const next = sanitize({ ...current, ...data })
  if (!next.createdAt) next.createdAt = new Date().toISOString()

  await redis.hset(KEY.user(userId), {
    name: next.name,
    emoji: next.emoji,
    color: next.color,
    reminderTime: next.reminderTime,
    createdAt: next.createdAt,
  })

  return next
}
