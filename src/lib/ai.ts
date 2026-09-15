import type { GradeResult, Lesson, LessonType } from './types'

/**
 * AI 抽象层：默认 Cloudflare Workers AI（REST API，Node.js 运行时可用），
 * 可通过 AI_PROVIDER 环境变量切换到 openai / anthropic。
 *
 * API Key 只在服务端使用，绝不暴露到客户端。
 */

export type AIProvider = 'cloudflare' | 'openai' | 'anthropic'

export function currentProvider(): AIProvider {
  const raw = (process.env.AI_PROVIDER || 'cloudflare').toLowerCase()
  if (raw === 'openai' || raw === 'anthropic') return raw
  return 'cloudflare'
}

export const PROVIDER_LABEL: Record<AIProvider, string> = {
  cloudflare: 'Cloudflare Workers AI',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
}

export function currentModel(): string {
  const p = currentProvider()
  if (p === 'openai') return process.env.OPENAI_MODEL || 'gpt-4o-mini'
  if (p === 'anthropic') return process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest'
  return process.env.CLOUDFLARE_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct'
}

export function isAIConfigured(): boolean {
  const p = currentProvider()
  if (p === 'openai') return Boolean(process.env.OPENAI_API_KEY)
  if (p === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY)
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_API_TOKEN)
}

type Message = { role: 'system' | 'user'; content: string }

/** 统一的大模型调用入口，失败返回 null（上层会走内置题库兜底） */
async function callAI(messages: Message[], maxTokens = 600): Promise<string | null> {
  const provider = currentProvider()
  try {
    if (provider === 'cloudflare') {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
      const token = process.env.CLOUDFLARE_AI_API_TOKEN
      if (!accountId || !token) return null
      const model = currentModel()
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messages, max_tokens: maxTokens }),
          cache: 'no-store',
        },
      )
      if (!res.ok) return null
      const json = (await res.json()) as {
        success?: boolean
        result?: { response?: string } | string
      }
      const result = json.result
      if (typeof result === 'string') return result
      return result?.response ?? null
    }

    if (provider === 'openai') {
      const key = process.env.OPENAI_API_KEY
      if (!key) return null
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: currentModel(),
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
        cache: 'no-store',
      })
      if (!res.ok) return null
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      return json.choices?.[0]?.message?.content ?? null
    }

    // anthropic
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) return null
    const system = messages.find((m) => m.role === 'system')?.content ?? ''
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: currentModel(),
        max_tokens: maxTokens,
        system,
        messages: messages.filter((m) => m.role === 'user'),
      }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { content?: { text?: string }[] }
    return json.content?.[0]?.text ?? null
  } catch {
    return null
  }
}

/** 从模型输出里抠出第一个 JSON 对象 */
function extractJSON(text: string): unknown | null {
  const cleaned = text.replace(/```json/gi, '```').replace(/```/g, '')
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- 内置题库兜底

const BANK: Record<LessonType, { question: string; hint: string; referenceAnswer: string }[]> = {
  word: [
    { question: '「坚持、持之以恒」的英文动词是？', hint: 'p____', referenceAnswer: 'persist' },
    { question: '「习惯」的英文名词是？', hint: 'h____', referenceAnswer: 'habit' },
    { question: '「进步」的英文名词是？', hint: 'p____', referenceAnswer: 'progress' },
    { question: '「目标」的英文名词是？', hint: 'g____', referenceAnswer: 'goal' },
    { question: '「完成、达成」的英文动词是？', hint: 'a____', referenceAnswer: 'achieve' },
  ],
  translate: [
    { question: '把这句话翻译成英文：我每天早上七点起床。', hint: 'wake up / at seven', referenceAnswer: 'I wake up at seven every morning.' },
    { question: '把这句话翻译成英文：今天我已经喝了两杯水。', hint: '现在完成时 / two cups of water', referenceAnswer: 'I have already drunk two cups of water today.' },
    { question: '把这句话翻译成英文：坚持锻炼让我更健康。', hint: 'keep doing / make ... healthier', referenceAnswer: 'Keeping exercise makes me healthier.' },
    { question: '把这句话翻译成英文：我打算下周开始跑步。', hint: 'plan to / take up', referenceAnswer: 'I plan to take up running next week.' },
    { question: '把这句话翻译成英文：别放弃，你已经很棒了。', hint: 'give up / well done', referenceAnswer: "Don't give up, you are already doing great." },
  ],
  'fill-blank': [
    { question: '填空：I ___ up at six every day. (get / gets)', hint: '主语是 I', referenceAnswer: 'get' },
    { question: '填空：She has ___ three books this month. (read / reads)', hint: '现在完成时用过去分词', referenceAnswer: 'read' },
    { question: '填空：We are ___ to build a new habit. (try / trying)', hint: 'be + 动词 ing', referenceAnswer: 'trying' },
    { question: '填空：He ___ his homework before dinner yesterday. (finish / finished)', hint: '过去时间状语 yesterday', referenceAnswer: 'finished' },
    { question: '填空：___ you like some tea? (Do / Would)', hint: '礼貌邀约', referenceAnswer: 'Would' },
  ],
  dialogue: [
    { question: '补全对话：A: How was your day?  B: ___', hint: '用一句话回答并保持对话自然', referenceAnswer: "Pretty good! I finished all my tasks and went for a walk." },
    { question: '补全对话：A: Do you exercise every day?  B: ___', hint: '肯定回答 + 补充一句', referenceAnswer: 'Yes, I do. I usually run for twenty minutes after work.' },
    { question: '补全对话：A: Why do you keep a daily check-in?  B: ___', hint: 'because ...', referenceAnswer: 'Because it helps me stay consistent and see my progress.' },
    { question: '补全对话：A: What time do you usually get up?  B: ___', hint: 'I usually get up at ...', referenceAnswer: 'I usually get up at six thirty in the morning.' },
    { question: '补全对话：A: Let us take a break.  B: ___', hint: '表示赞同', referenceAnswer: "That sounds great. I could use a cup of coffee." },
  ],
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/** 难度分级：学习天数越多，题型越难 */
function typeByLevel(level: number, seed: number): LessonType {
  if (level < 7) return seed % 2 === 0 ? 'word' : 'translate'
  if (level < 21) return seed % 3 === 0 ? 'fill-blank' : 'translate'
  if (level < 45) return seed % 3 === 0 ? 'dialogue' : 'fill-blank'
  return seed % 2 === 0 ? 'dialogue' : 'translate'
}

export function buildFallbackLesson(date: string, level = 0): Lesson {
  const seed = hashString(date)
  const type = typeByLevel(level, seed)
  const pool = BANK[type]
  const item = pool[seed % pool.length]
  return {
    type,
    question: item.question,
    hint: item.hint,
    referenceAnswer: item.referenceAnswer,
    source: 'fallback',
  }
}

const LEVEL_HINT: Record<number, string> = {
  0: '难度：入门（基础单词 / 简单短句）',
  7: '难度：初级（短句翻译）',
  21: '难度：中级（语法填空 / 短对话）',
  45: '难度：进阶（情景对话）',
}

function levelHint(level: number): string {
  if (level >= 45) return LEVEL_HINT[45]
  if (level >= 21) return LEVEL_HINT[21]
  if (level >= 7) return LEVEL_HINT[7]
  return LEVEL_HINT[0]
}

/** 生成当天英语任务。AI 不可用时用内置题库兜底，保证功能可用。 */
export async function generateDailyLesson(date: string, level = 0): Promise<Lesson> {
  if (!isAIConfigured()) return buildFallbackLesson(date, level)

  const system = [
    'You are an English teacher for Chinese speakers.',
    'Always reply with ONE minified JSON object only, no markdown, no explanation.',
    'JSON schema: {"type":"translate"|"fill-blank"|"word"|"dialogue","question":"string in Chinese or English","hint":"short string","referenceAnswer":"string"}',
  ].join(' ')

  const user = [
    `Date: ${date}. Student level: ${levelHint(level)} (days learned: ${level}).`,
    'Create ONE short daily English exercise that can be answered in under 30 seconds.',
    'The question text should be understandable by a Chinese learner.',
  ].join(' ')

  const raw = await callAI([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ])
  if (!raw) return buildFallbackLesson(date, level)

  const data = extractJSON(raw) as Partial<Lesson> | null
  if (!data || typeof data.question !== 'string' || typeof data.referenceAnswer !== 'string') {
    return buildFallbackLesson(date, level)
  }
  const type = (['translate', 'fill-blank', 'word', 'dialogue'] as LessonType[]).includes(
    data.type as LessonType,
  )
    ? (data.type as LessonType)
    : 'translate'

  return {
    type,
    question: data.question.slice(0, 300),
    hint: typeof data.hint === 'string' ? data.hint.slice(0, 120) : '',
    referenceAnswer: data.referenceAnswer.slice(0, 300),
    source: 'ai',
  }
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function similarity(a: string, b: string): number {
  const A = new Set(normalizeText(a).split(' ').filter(Boolean))
  const B = new Set(normalizeText(b).split(' ').filter(Boolean))
  if (B.size === 0) return 0
  let hit = 0
  for (const w of A) if (B.has(w)) hit += 1
  return hit / B.size
}

/** 内置兜底批改：无 AI 时也能给出有参考价值的反馈 */
export function fallbackGrade(lesson: Lesson, answer: string): GradeResult {
  const ratio = similarity(answer, lesson.referenceAnswer)
  const exact = normalizeText(answer) === normalizeText(lesson.referenceAnswer)
  const score = exact ? 100 : Math.max(35, Math.round(ratio * 95))

  return {
    score,
    correct: exact || ratio >= 0.8,
    feedback:
      exact
        ? '完全正确！继续保持 👏'
        : ratio >= 0.8
          ? '基本正确，个别用词可以再打磨一下。'
          : ratio >= 0.4
            ? '方向对了，但和参考答案还有差距，注意关键词和语序。'
            : '再试一次～ 先看看参考答案，理解句子结构后再写一遍。',
    suggestion: exact ? '' : `参考答案：${lesson.referenceAnswer}`,
    source: 'fallback',
  }
}

/** 提交答案 → AI 批改 */
export async function gradeAnswer(lesson: Lesson, userAnswer: string): Promise<GradeResult> {
  const answer = userAnswer.slice(0, 500)
  if (!isAIConfigured()) return fallbackGrade(lesson, answer)

  const system = [
    'You are a friendly English teacher grading a student answer.',
    'Always reply with ONE minified JSON object only.',
    'JSON schema: {"score":0-100,"correct":boolean,"feedback":"string in Chinese","suggestion":"string"}',
  ].join(' ')

  const user = [
    `Question: ${lesson.question}`,
    `Reference answer: ${lesson.referenceAnswer}`,
    `Student answer: ${answer || '(empty)'}`,
    'Be encouraging. Feedback must be in Chinese and under 60 Chinese characters.',
  ].join('\n')

  const raw = await callAI(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    400,
  )
  if (!raw) return fallbackGrade(lesson, answer)

  const data = extractJSON(raw) as Partial<GradeResult> | null
  if (!data || typeof data.feedback !== 'string') return fallbackGrade(lesson, answer)

  const score = Math.max(0, Math.min(100, Math.round(Number(data.score) || 0)))
  return {
    score,
    correct: typeof data.correct === 'boolean' ? data.correct : score >= 60,
    feedback: data.feedback.slice(0, 300),
    suggestion: typeof data.suggestion === 'string' ? data.suggestion.slice(0, 300) : '',
    source: 'ai',
  }
}
