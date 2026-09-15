import { SignUp } from '@clerk/nextjs'

export const metadata = { title: '注册 · 打卡么' }

export default function SignUpPage() {
  return (
    <div style={{ display: 'grid', gap: 18, paddingTop: 32, justifyItems: 'center' }}>
      <div style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 38, lineHeight: 1 }}>✅</span>
        <h1 style={{ fontSize: 21, fontWeight: 700 }}>创建账号</h1>
        <p className="hint">3 秒完成注册，开始你的第一次打卡。</p>
      </div>
      <SignUp />
    </div>
  )
}
