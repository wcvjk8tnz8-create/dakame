import type { WeekDot } from '@/lib/types'

/** 本周 7 天点阵 */
export default function WeekDots({ dots }: { dots: WeekDot[] }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
      {dots.map((d) => (
        <div key={d.date} style={{ display: 'grid', justifyItems: 'center', gap: 6, flex: 1 }}>
          <span className="hint" style={{ fontSize: 11 }}>
            {d.label}
          </span>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 10,
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: d.done ? '#fff' : 'var(--color-muted)',
              background: d.done ? 'var(--habit)' : 'transparent',
              border: d.isToday
                ? '2px solid var(--habit)'
                : `1px solid ${d.done ? 'transparent' : 'var(--color-line)'}`,
              opacity: d.isFuture ? 0.4 : 1,
            }}
          >
            {d.done ? '✓' : Number(d.date.slice(-2))}
          </span>
        </div>
      ))}
    </div>
  )
}
