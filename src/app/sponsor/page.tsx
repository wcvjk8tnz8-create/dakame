import { ArrowLeft, Coffee } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import SponsorActions from '@/components/SponsorActions'
import { SPONSOR_URL } from '@/lib/env'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '赞助 · 打卡么',
  description: '打卡么是免费、无广告的开源项目。如果这个 App 帮到了你，可以请作者喝杯奶茶。',
}

/** 捐助页：公开访问，不需要登录 */
export default function SponsorPage() {
  return (
    <div style={{ display: 'grid', gap: 16, paddingBottom: 24 }}>
      <Link href="/" className="hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <ArrowLeft size={14} /> 返回打卡
      </Link>

      <div style={{ textAlign: 'center', display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 34, lineHeight: 1 }}>☕</span>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>请作者喝杯奶茶</h1>
        <p className="hint">打卡么永久免费、无广告、不卖数据。</p>
      </div>

      <div className="card" style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
        <div
          style={{
            width: '100%',
            maxWidth: 320,
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid var(--color-line)',
          }}
        >
          <Image
            src="/sponsor-alipayhk.jpg"
            alt="AlipayHK 收款二维码"
            width={675}
            height={864}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            priority
          />
        </div>

        <p className="hint" style={{ textAlign: 'center' }}>
          用 AlipayHK 扫码即可，金额随意。
          <br />
          每一笔都会直接变成服务器账单 💸
        </p>

        <SponsorActions url={SPONSOR_URL} />
      </div>

      <div className="card" style={{ display: 'grid', gap: 8 }}>
        <div className="card-title">
          <Coffee size={14} /> 钱花在哪
        </div>
        <ul className="hint" style={{ paddingLeft: 18, margin: 0, display: 'grid', gap: 4 }}>
          <li style={{ listStyle: 'disc' }}>Upstash Redis：所有打卡数据的存储</li>
          <li style={{ listStyle: 'disc' }}>Clerk：账号与登录安全</li>
          <li style={{ listStyle: 'disc' }}>Cloudflare Workers AI：每日英语题生成与批改</li>
        </ul>
        <p className="hint">
          目前用量都在各家的免费额度内，成本接近 0。作者是个学生，赞助主要用于续费与买咖啡 ☕
        </p>
      </div>

      <p className="hint" style={{ textAlign: 'center' }}>
        捐助页地址：{SPONSOR_URL}
      </p>
    </div>
  )
}
