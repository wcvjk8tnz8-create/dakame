import { dayOffset, fromISODate, todayISO, toISODate, toYYYYMM } from './date'
import { getRedis, KEY } from './redis'
import type { GradeResult, LearnRecord, Lesson } from './types'

/**
 * 英语学习记录。
 * - dakame:learn:{userId}:{yyyyMM}    Bitmap，标记当天是否完成英语任务
 * - dakame:learn:answers:{userId}     Hash，field = yyyy-MM-dd，value = JSON
 * - dakame:learn:daily:{yyyy-MM-dd}   String，当天题目（全局共享，避免重复调用 AI），TTL 7 天
 */

const DAILY_TTL_SECONDS = 7 * 24 * 60 * 60

function monthKeyOf(iso: string): string {
  return toYYYYMM(fromISODate(iso))
}

/** 当天题目：优先读 Redis 缓存，未命中再生成并写回（7 天 TTL） */
export async function getDailyLesson(
  date: string,
  generate: (date: string, level: number) => Promise<Lesson>,
  level = 0,
): Promise<Lesson> {
  const redis = getRedis()
  const key = KEY.dailyLesson(date)

  try {
    const cached = await redis.get<Lesson>(key)
    if (cached && typeof cached.question === 'string') {
      return { ...cached, source: cached.source ?? 'ai' }
    }
  } catch {
    // 缓存读取失败不阻塞主流程
  }

  const lesson = await generate(date, level)

  try {
    await redis.set(key, JSON.stringify(lesson), { ex: DAILY_TTL_SECONDS })
  } catch {
    // 写缓存失败可忽略
  }

  return lesson
}

/** 某天是否完成英语任务 */
export async function getLearnStatus(userId: string, date: string): Promise<boolean> {
  const redis = getRedis()
  const bit = await redis.getbit(KEY.learn(userId, monthKeyOf(date)), dayOffset(date))
  return Number(bit) === 1
}

/** 标记/取消完成英语任务 */
export async function setLearnStatus(
  userId: string,
  date: string,
  done: boolean,
): Promise<boolean> {
  const redis = getRedis()
  await redis.setbit(KEY.learn(userId, monthKeyOf(date)), dayOffset(date), done ? 1 : 0)
  return done
}

type StoredAnswer = {
  lesson: Lesson | null
  answer: string
  result: GradeResult | null
  at: string
}

/** 保存答案与批改结果 */
export async function saveAnswer(
  userId: string,
  date: string,
  lesson: Lesson,
  answer: string,
  result: GradeResult,
): Promise<void> {
  const redis = getRedis()
  const payload: StoredAnswer = {
    lesson,
    answer: answer.slice(0, 500),
    result,
    at: new Date().toISOString(),
  }
  await redis.hset(KEY.learnAnswers(userId), { [date]: JSON.stringify(payload) })
}

/** 读取某天的学习记录 */
export async function getLearnRecord(
  userId: string,
  date: string,
): Promise<LearnRecord | null> {
  const redis = getRedis()
  const raw = (await redis.hget(KEY.learnAnswers(userId), date)) as unknown
  if (!raw) return null
  const parsed = (
    typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw
  ) as StoredAnswer
  return {
    date,
    lesson: parsed.lesson ?? null,
    answer: parsed.answer ?? '',
    result: parsed.result ?? null,
    done: true,
  }
}

/** 最近 N 天学习记录 */
export async function getLearnHistory(
  userId: string,
  days = 7,
): Promise<LearnRecord[]> {
  const dates: string[] = []
  const today = fromISODate(todayISO())
  for (let i = 0; i < days; i += 1) {
    dates.unshift(toISODate(new Date(today.getTime() - i * 24 * 60 * 60 * 1000)))
  }

  const redis = getRedis()
  const pipeline = redis.pipeline()
  for (const d of dates) {
    pipeline.hget(KEY.learnAnswers(userId), d)
  }
  const rawList = (await pipeline.exec()) as unknown[]

  return dates.map((date, i) => {
    const raw = rawList[i] as unknown
    if (!raw) return { date, lesson: null, answer: '', result: null, done: false }
    const parsed = (
      typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw
    ) as StoredAnswer
    return {
      date,
      lesson: parsed.lesson ?? null,
      answer: parsed.answer ?? '',
      result: parsed.result ?? null,
      done: Boolean(parsed.result),
    }
  })
}

/** 累计学习天数（用于难度递增） */
export async function countLearnDays(userId: string): Promise<number> {
  const redis = getRedis()
  const pipeline = redis.pipeline()
  for (let m = 1; m <= 12; m += 1) {
    pipeline.bitcount(
      KEY.learn(
        userId,
        `${fromISODate(todayISO()).getUTCFullYear()}${String(m).padStart(2, '0')}`,
      ),
      0,
      -1,
    )
  }
  const result = (await pipeline.exec()) as unknown[]
  let total = 0
  for (const v of result) total += Number(v) || 0
  return total
}

/** 导出用：最近 90 天的学习记录 */
export async function exportLearnAnswers(
  userId: string,
): Promise<Record<string, StoredAnswer>> {
  const redis = getRedis()
  const raw = (await redis.hgetall(KEY.learnAnswers(userId))) as
    | Record<string, unknown>
    | null
  if (!raw) return {}
  const out: Record<string, StoredAnswer> = {}
  for (const [k, v] of Object.entries(raw)) {
    out[k] = (typeof v === 'string' ? (JSON.parse(v) as unknown) : v) as StoredAnswer
  }
  return out
}
