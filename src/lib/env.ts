/**
 * 环境变量状态检查。
 * 缺配置时不崩 500，而是在页面上渲染一份「怎么配」的说明（见 components/SetupNotice.tsx）。
 */

export type EnvKey =
  | 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  | 'CLERK_SECRET_KEY'
  | 'UPSTASH_REDIS_REST_URL'
  | 'UPSTASH_REDIS_REST_TOKEN'

export function hasClerk(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
  )
}

export function missingEnv(): EnvKey[] {
  const required: EnvKey[] = [
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
  ]
  return required.filter((k) => !process.env[k])
}

export function isAppConfigured(): boolean {
  return missingEnv().length === 0
}

/** 捐助页外链（可在 .env.local 覆盖） */
export const SPONSOR_URL = process.env.NEXT_PUBLIC_SPONSOR_URL ?? 'https://xxx.com/sponsor'
