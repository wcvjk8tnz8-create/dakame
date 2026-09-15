'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export default function SponsorActions({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('复制这个链接：', url)
    }
  }

  return (
    <button className="btn" onClick={copy} style={{ width: '100%' }}>
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? '已复制链接' : '复制捐助页链接'}
    </button>
  )
}
