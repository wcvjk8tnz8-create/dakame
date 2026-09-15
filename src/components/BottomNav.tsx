'use client'

import { CalendarDays, GraduationCap, Settings, Target, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: '今日', icon: CheckCircle2 },
  { href: '/learn', label: '学习', icon: GraduationCap },
  { href: '/calendar', label: '日历', icon: CalendarDays },
  { href: '/goals', label: '目标', icon: Target },
  { href: '/settings', label: '设置', icon: Settings },
] as const

const HIDDEN_ON = ['/sign-in', '/sign-up', '/sponsor']

export default function BottomNav() {
  const pathname = usePathname()

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-[var(--color-line)] bg-[rgba(11,11,18,0.92)] backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors"
                style={{ color: active ? 'var(--habit)' : 'var(--color-muted)' }}
              >
                <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
