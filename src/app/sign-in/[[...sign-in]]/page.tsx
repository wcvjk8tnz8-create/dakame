import { SignIn } from '@clerk/nextjs'

export const metadata = { title: '登录 · 打卡么' }

export default function SignInPage() {
  return (
    <div style={{ display: 'grid', gap: 18, paddingTop: 32, justifyItems: 'center' }}>
      <div style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 38, lineHeight: 1 }}>✅</span>
        <h1 style={{ fontSize: 21, fontWeight: 700 }}>打卡么</h1>
        <p className="hint">登录后即可开始打卡，数据只属于你。</p>
      </div>
      <SignIn />
    </div>
  )
}
