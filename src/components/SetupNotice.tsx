import Link from 'next/link'

import { missingEnv } from '@/lib/env'

const DOCS: Record<string, string> = {
  AUTH_SECRET: '任意 32 位随机字符串，可用 openssl rand -hex 32 生成',
  UPSTASH_REDIS_REST_URL: 'Upstash 控制台 → 数据库详情 → REST API → UPSTASH_REDIS_REST_URL',
  UPSTASH_REDIS_REST_TOKEN: 'Upstash 控制台 → 数据库详情 → REST API → UPSTASH_REDIS_REST_TOKEN',
}

/** 环境变量没配好时，展示一份「照着填」的说明，而不是 500 */
export default function SetupNotice() {
  const missing = missingEnv()

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <div>
        <div className="text-base font-semibold">还差一步就能跑起来 🚀</div>
        <p className="hint mt-1">
          复制 <code>.env.local.example</code> 为 <code>.env.local</code>，填入下面缺失的变量后重启
          <code> pnpm dev</code>。
        </p>
      </div>

      <ul style={{ display: 'grid', gap: 8 }}>
        {missing.map((key) => (
          <li key={key} className="card" style={{ padding: 12 }}>
            <div className="font-mono text-[13px]" style={{ color: 'var(--habit)' }}>
              {key}
            </div>
            <div className="hint">{DOCS[key]}</div>
          </li>
        ))}
      </ul>

      <Link
        href="https://github.com/wcvjk8tnz8-create/dakame#readme"
        className="btn"
        target="_blank"
      >
        查看完整配置说明
      </Link>
    </div>
  )
}
