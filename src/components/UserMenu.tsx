'use client'

import { LogOut, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { signOutAction, signOutAllAction } from '@/app/auth-actions'

type Props = {
  name: string
  email: string
  avatarUrl: string
  sessions: number
}

/** 右上角用户菜单：展示账号信息 + 登出 */
export default function UserMenu({ name, email, avatarUrl, sessions }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="账号菜单"
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          overflow: 'hidden',
          border: '1px solid var(--color-line)',
          background: 'var(--color-card-2)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--color-text)',
        }}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%' }} />
        ) : (
          (name || email || '?').slice(0, 1).toUpperCase()
        )}
      </button>

      {open ? (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          />
          <div
            className="card"
            style={{
              position: 'absolute',
              right: 0,
              top: 42,
              zIndex: 50,
              width: 232,
              display: 'grid',
              gap: 10,
              padding: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>
              <div className="hint" style={{ wordBreak: 'break-all' }}>
                {email}
              </div>
            </div>

            <div
              className="hint"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#0f0f18',
                borderRadius: 10,
                padding: '7px 9px',
              }}
            >
              <ShieldCheck size={13} /> 当前 {Math.max(sessions, 1)} 台设备已登录
            </div>

            <form action={signOutAction}>
              <button type="submit" className="btn" style={{ width: '100%' }}>
                <LogOut size={15} /> 退出登录
              </button>
            </form>
            <form action={signOutAllAction}>
              <button type="submit" className="btn btn-danger" style={{ width: '100%' }}>
                退出所有设备
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  )
}
