import {
  dateRange,
  dayOffset,
  daysInMonthOf,
  fromISODate,
  isValidDateString,
  monthStart,
  shiftMonth,
  todayISO,
  toISODate,
  toYYYYMM,
  weekDays,
  weekStart,
} from './date'
import { getRedis, KEY, listUserKeys } from './redis'
import type { WeekDot } from './types'

/**
 * 打卡记录：Redis Bitmap 核心逻辑。
 * key    : dakame:checkin:{userId}:{yyyyMM}
 * offset : date.getDate() - 1  （每月 1 日 = 0）
 * value  : 1 = 已打卡，0 = 未打卡
 */

/** 一个月最多 31 天，据此批量取位 */
async function getMonthBits(userId: string, yyyyMM: string): Promise<number[]> {
  const days = Number(yyyyMM.slice(4, 6)) === 2 ? 29 : 31
  const redis = getRedis()
  const key = KEY.checkin(userId, yyyyMM)
  const pipeline = redis.pipeline()
  for (let offset = 0; offset < days; offset += 1) {
    pipeline.getbit(key, offset)
  }
  const result = (await pipeline.exec()) as unknown[]
  return result.map((v) => (Number(v) === 1 ? 1 : 0))
}

function monthKeyOf(iso: string): string {
  return toYYYYMM(fromISODate(iso))
}

/** 某天是否已打卡 */
export async function getCheckIn(userId: string, date: string): Promise<boolean> {
  const redis = getRedis()
  const bit = await redis.getbit(KEY.checkin(userId, monthKeyOf(date)), dayOffset(date))
  return Number(bit) === 1
}

/** 写入打卡状态（1 / 0），返回写入后的状态 */
export async function setCheckIn(
  userId: string,
  date: string,
  value: boolean,
): Promise<boolean> {
  if (!isValidDateString(date)) throw new Error(`非法日期：${date}`)
  const redis = getRedis()
  await redis.setbit(KEY.checkin(userId, monthKeyOf(date)), dayOffset(date), value ? 1 : 0)
  return value
}

/** 切换某天打卡状态，返回切换后的状态 */
export async function toggleCheckIn(userId: string, date: string): Promise<boolean> {
  const current = await getCheckIn(userId, date)
  return setCheckIn(userId, date, !current)
}

/** 该月每天打卡状态（0 未打卡 / 1 已打卡），长度 = 当月天数 */
export async function getMonthCheckIns(
  userId: string,
  year: number,
  month: number, // 1-12
): Promise<boolean[]> {
  const yyyyMM = `${year}${String(month).padStart(2, '0')}`
  const days = daysInMonthOf(`${yyyyMM.slice(0, 4)}-${yyyyMM.slice(4, 6)}-01`)
  const bits = await getMonthBits(userId, yyyyMM)
  return bits.slice(0, days).map((b) => b === 1)
}

/** 当月打卡天数（BITCOUNT） */
export async function getMonthCount(
  userId: string,
  year: number,
  month: number,
): Promise<number> {
  const redis = getRedis()
  const yyyyMM = `${year}${String(month).padStart(2, '0')}`
  // BITCOUNT key 0 -1：统计整个 bitmap（类型上需要显式 start/end）
  const count = await redis.bitcount(KEY.checkin(userId, yyyyMM), 0, -1)
  return Number(count) || 0
}

/** 当年打卡天数：12 个月的 BITCOUNT 求和 */
export async function getYearCount(userId: string, year: number): Promise<number> {
  const redis = getRedis()
  const pipeline = redis.pipeline()
  for (let m = 1; m <= 12; m += 1) {
    pipeline.bitcount(KEY.checkin(userId, `${year}${String(m).padStart(2, '0')}`), 0, -1)
  }
  const result = (await pipeline.exec()) as unknown[]
  let total = 0
  for (const v of result) total += Number(v) || 0
  return total
}

/** 任意闭区间内的打卡天数（可能跨月） */
export async function getRangeCount(
  userId: string,
  from: string,
  to: string,
): Promise<number> {
  const days = dateRange(from, to)
  if (days.length === 0) return 0

  // 按月份分组，一次 pipeline 取完
  const byMonth = new Map<string, string[]>()
  for (const d of days) {
    const k = monthStart(d).slice(0, 7)
    const list = byMonth.get(k) ?? []
    list.push(d)
    byMonth.set(k, list)
  }

  const redis = getRedis()
  const pipeline = redis.pipeline()
  for (const [k, list] of byMonth) {
    const yyyyMM = k.replace('-', '')
    for (const d of list) {
      pipeline.getbit(KEY.checkin(userId, yyyyMM), dayOffset(d))
    }
  }
  const flat = (await pipeline.exec()) as unknown[]
  let total = 0
  for (const v of flat) if (Number(v) === 1) total += 1
  return total
}

/**
 * 当前连续打卡天数。
 * 规则：今天已打卡 → 从今天往前数；今天还没打卡 → 从昨天往前数（今天还没结束，不算断）。
 */
export async function getStreak(userId: string): Promise<number> {
  const cache = new Map<string, number[]>()
  const today = todayISO()

  async function bitOf(date: string): Promise<number> {
    const yyyyMM = monthKeyOf(date)
    let bits = cache.get(yyyyMM)
    if (!bits) {
      bits = await getMonthBits(userId, yyyyMM)
      cache.set(yyyyMM, bits)
    }
    return bits[dayOffset(date)] ?? 0
  }

  let cursor = today
  let streak = 0

  if ((await bitOf(today)) === 0) {
    cursor = toISODate(
      new Date(fromISODate(today).getTime() - 24 * 60 * 60 * 1000),
    )
  }

  // 最多回溯 400 天，防止异常数据造成死循环
  for (let i = 0; i < 400; i += 1) {
    if ((await bitOf(cursor)) !== 1) break
    streak += 1
    cursor = toISODate(new Date(fromISODate(cursor).getTime() - 24 * 60 * 60 * 1000))
  }

  return streak
}

/** 本周（周一 ~ 周日）7 天打卡状态 */
export async function getWeekCheckIns(userId: string): Promise<WeekDot[]> {
  const today = todayISO()
  const days = weekDays(today)
  const daysInThisWeek = days.filter((d) => d <= today || true) // 本周 7 天全给，未来的标记 isFuture
  const redis = getRedis()
  const pipeline = redis.pipeline()
  for (const d of daysInThisWeek) {
    pipeline.getbit(KEY.checkin(userId, monthKeyOf(d)), dayOffset(d))
  }
  const result = (await pipeline.exec()) as unknown[]
  const labels = ['一', '二', '三', '四', '五', '六', '日']

  return daysInThisWeek.map((date, i) => ({
    date,
    label: labels[i],
    done: Number(result[i]) === 1,
    isToday: date === today,
    isFuture: date > today,
  }))
}

/** 本周已打卡次数（周一到今天） */
export async function getWeekCount(userId: string): Promise<number> {
  const today = todayISO()
  return getRangeCount(userId, weekStart(today), today)
}

/** 导出用：返回某月所有已打卡的日期（yyyy-MM-dd） */
export async function listCheckInDates(
  userId: string,
  year: number,
  month: number,
): Promise<string[]> {
  const yyyyMM = `${year}${String(month).padStart(2, '0')}`
  const days = daysInMonthOf(`${year}-${String(month).padStart(2, '0')}-01`)
  const bits = await getMonthBits(userId, yyyyMM)
  const out: string[] = []
  for (let i = 0; i < days; i += 1) {
    if (bits[i] === 1) {
      out.push(`${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)
    }
  }
  return out
}

/** 导出用：扫描用户所有打卡月份 */
export async function findCheckInMonths(userId: string): Promise<string[]> {
  const keys = await listUserKeys(userId)
  return keys
    .filter((k) => k.startsWith(`dakame:checkin:${userId}:`))
    .map((k) => k.split(':').pop() as string)
    .sort()
}

/** 月份导航辅助 */
export function nextMonth(iso: string): string {
  return shiftMonth(iso, 1)
}
export function prevMonth(iso: string): string {
  return shiftMonth(iso, -1)
}
