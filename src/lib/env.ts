/**
 * 环境变量状态检查。
 * 缺配置时不崩 500，而是在页面上渲染一份「怎么配」的说明（见 components/SetupNotice.tsx）。
 */

export type EnvKey =
  | 'AUTH_SECRET'
  | 'UPSTASH_REDIS_REST_URL'
  | 'UPSTASH_REDIS_REST_TOKEN'

export function missingEnv(): EnvKey[] {
  const required: EnvKey[] = [
    'AUTH_SECRET',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
  ]
  return required.filter((k) => !process.env[k])
}

export function isAppConfigured(): boolean {
  return missingEnv().length === 0
}

/**
 * 捐助页链接。
 * 默认指向项目自带的 /sponsor 页面（内含 AlipayHK 收款码）；
 * 想换成自己的外链时，在 .env.local 里设 NEXT_PUBLIC_SPONSOR_URL 即可。
 */
export const SPONSOR_URL = process.env.NEXT_PUBLIC_SPONSOR_URL ?? '/sponsor'
