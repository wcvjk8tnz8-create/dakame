import { Lightbulb, Sparkles } from 'lucide-react'

import type { Lesson, LessonType } from '@/lib/types'

const TYPE_LABEL: Record<LessonType, string> = {
  translate: '翻译',
  'fill-blank': '填空',
  word: '单词',
  dialogue: '对话',
}

export default function LessonCard({
  lesson,
  providerLabel,
}: {
  lesson: Lesson
  providerLabel: string
}) {
  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: 999,
            background: 'color-mix(in srgb, var(--habit) 22%, transparent)',
            color: 'var(--habit)',
          }}
        >
          {TYPE_LABEL[lesson.type]}
        </span>
        <span className="hint" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={12} />
          {providerLabel}
          {lesson.source === 'fallback' ? ' · 内置题库' : ''}
        </span>
      </div>

      <div style={{ fontSize: 16, lineHeight: 1.7, fontWeight: 500 }}>{lesson.question}</div>

      {lesson.hint ? (
        <div
          className="hint"
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'flex-start',
            background: '#0f0f18',
            border: '1px dashed var(--color-line)',
            borderRadius: 12,
            padding: '9px 11px',
          }}
        >
          <Lightbulb size={13} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>提示：{lesson.hint}</span>
        </div>
      ) : null}
    </div>
  )
}
