import type { GoalProgressItem } from '@/lib/types'

const SIZE = 62
const STROKE = 7
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

export function ProgressRing({ item }: { item: GoalProgressItem }) {
  const offset = C - (Math.min(100, item.percent) / 100) * C

  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={item.achieved ? '#22c55e' : 'var(--habit)'}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {item.percent}%
        </div>
      </div>
      <div className="hint" style={{ fontSize: 11 }}>
        {item.label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>
        {item.current}
        <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}> / {item.target}</span>
      </div>
    </div>
  )
}

/** 目标进度：三个进度环 + 达成庆祝 */
export default function GoalProgress({ progress }: { progress: GoalProgressItem[] }) {
  const achieved = progress.filter((p) => p.achieved && p.target > 0)

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        {progress.map((item) => (
          <ProgressRing key={item.kind} item={item} />
        ))}
      </div>

      {achieved.length > 0 ? (
        <div
          className="card"
          style={{
            padding: '10px 12px',
            borderColor: '#1f5c37',
            background: 'linear-gradient(180deg,#12281c,#0f1d15)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            🎉 已达成：{achieved.map((a) => a.label).join('、')}目标
          </div>
          <div className="hint">保持住，这就是复利的力量。</div>
        </div>
      ) : null}
    </div>
  )
}
