'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2, ChevronRight, CheckCircle2, X } from 'lucide-react'

export function PlanTodayButton() {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [summary, setSummary] = useState('')
  const [count, setCount] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  async function planToday() {
    setState('loading')
    try {
      const res = await fetch('/api/schedule-today', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setSummary(data.summary ?? '')
      setCount(data.count ?? 0)
      setState('done')
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  if (dismissed) return null

  // Done state — show result inline
  if (state === 'done') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 9,
        background: '#f0faf4', border: '1px solid #c6e6d4',
        fontFamily: 'DM Sans, sans-serif',
        animation: 'fadeIn 0.3s ease',
      }}>
        <CheckCircle2 size={16} style={{ color: '#2d7a4f', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: '#1f5537', margin: 0 }}>
            {count} task{count !== 1 ? 's' : ''} scheduled for today
          </p>
          {summary && (
            <p style={{ fontSize: 11.5, color: '#2d7a4f', margin: '2px 0 0', opacity: 0.8 }}>
              {summary}
            </p>
          )}
        </div>
        <button
          onClick={() => router.push('/dashboard/calendar')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, fontWeight: 600, color: '#2d7a4f',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px', borderRadius: 6,
            fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
          }}
        >
          View <ChevronRight size={12} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: 2, flexShrink: 0 }}
        >
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={planToday}
      disabled={state === 'loading'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
        background: state === 'loading' ? '#f0f0ee' : '#1a1a1a',
        color: state === 'loading' ? '#aaa' : '#fff',
        border: 'none', cursor: state === 'loading' ? 'not-allowed' : 'pointer',
        textDecoration: 'none', fontFamily: 'DM Sans, sans-serif',
        transition: 'all 0.15s',
        boxShadow: state === 'loading' ? 'none' : '0 2px 6px rgba(0,0,0,0.15)',
      }}
    >
      {state === 'loading'
        ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />Planning…</>
        : state === 'error'
        ? <>Try again</>
        : <><Zap size={13} />Plan today</>
      }
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: none } }
      `}</style>
    </button>
  )
}
