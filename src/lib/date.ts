import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

/**
 * 日期工具。
 * 关键约定：
 *  - 对外一律使用 `yyyy-MM-dd` 字符串（本地/业务日期，不含时区）。
 *  - 内部转成 UTC 零点 Date，配合 TZ=UTC 让 date-fns 的计算结果稳定不漂移。
 *  - 「今天」按 APP_TIMEZONE 计算（默认 Asia/Shanghai，覆盖香港/内地）。
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Shanghai'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  )
}

/** `yyyy-MM-dd` → UTC 零点 Date */
export function fromISODate(iso: string): Date {
  if (!isValidDateString(iso)) {
    throw new Error(`非法日期格式：${iso}（应为 yyyy-MM-dd）`)
  }
  return new Date(`${iso}T00:00:00Z`)
}

/** Date → `yyyy-MM-dd` */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Date → `yyyyMM`（Redis bitmap key 后缀） */
export function toYYYYMM(date: Date): string {
  return format(date, 'yyyyMM')
}

/** 「今天」，按 APP_TIMEZONE 计算 */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function todayDate(): Date {
  return fromISODate(todayISO())
}

/** bitmap offset：每月 1 日 = 0 */
export function dayOffset(iso: string): number {
  return fromISODate(iso).getUTCDate() - 1
}

/** 该月天数 */
export function daysInMonthOf(iso: string): number {
  const d = fromISODate(iso)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
}

/** 月首 / 月末（yyyy-MM-dd） */
export function monthStart(iso: string): string {
  return toISODate(startOfMonth(fromISODate(iso)))
}
export function monthEnd(iso: string): string {
  return toISODate(endOfMonth(fromISODate(iso)))
}

/** 周一为一周起点 */
export function weekStart(iso: string): string {
  return toISODate(startOfWeek(fromISODate(iso), { weekStartsOn: 1 }))
}

/** 周一 ~ 周日 共 7 天 */
export function weekDays(iso: string): string[] {
  const start = fromISODate(weekStart(iso))
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)))
}

/** 0=周一 … 6=周日 */
export function weekdayIndex(iso: string): number {
  const day = getDay(fromISODate(iso)) // 0=周日
  return (day + 6) % 7
}

/** 闭区间 [from, to] 内的每一天 */
export function dateRange(from: string, to: string): string[] {
  return eachDayOfInterval({ start: fromISODate(from), end: fromISODate(to) }).map(
    toISODate,
  )
}

export function shiftMonth(iso: string, delta: number): string {
  return toISODate(addMonths(fromISODate(iso), delta))
}

export function isFuture(iso: string): boolean {
  return fromISODate(iso).getTime() > fromISODate(todayISO()).getTime()
}

export function isToday(iso: string): boolean {
  return iso === todayISO()
}

export function sameDay(a: string, b: string): boolean {
  return isSameDay(fromISODate(a), fromISODate(b))
}

/** 中文星期，用于日历表头 */
export const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const

/** 友好显示：2026年9月15日 星期二 */
export function prettyDate(iso: string): string {
  const d = fromISODate(iso)
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getUTCDay()]
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日 星期${week}`
}

/** 由 `yyyy-MM` 或 `yyyyMM` 得到该月第一天；非法则返回今天所在月 */
export function safeMonth(input: string | undefined): string {
  if (!input) return toISODate(startOfMonth(todayDate()))
  const normalized =
    /^\d{6}$/.test(input) ? `${input.slice(0, 4)}-${input.slice(4, 6)}` : input
  if (!/^\d{4}-\d{2}$/.test(normalized)) {
    return toISODate(startOfMonth(todayDate()))
  }
  return `${normalized}-01`
}
