'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react'

type Nudge = {
  id: string
  type: string
  message: string
  severity: 'high' | 'medium'
  taskId?: string
  actionLabel?: string
  actionHref?: string
}

const NUDGE_STYLE = {
  overdue:       { bg: '#fff5f5', border: '#fecaca', icon: '#dc2626', text: '#7f1d1d' },
  deadline_risk: { bg: '#fff5f5', border: '#fecaca', icon: '#dc2626', text: '#7f1d1d' },
  overload:      { bg: '#fff8f0', border: '#fed7aa', icon: '#ea580c', text: '#9a3412' },
  reschedule:    { bg: '#f5f3ff', border: '#ddd6fe', icon: '#7c3aed', text: '#4c1d95' },
  stale:         { bg: '#fdf8ee', border: '#e8d5a0', icon: '#c9a84c', text: '#7a5e1a' },
}

function getStyle(nudge: Nudge) {
  return NUDGE_STYLE[nudge.type as keyof typeof NUDGE_STYLE] ??
    (nudge.severity === 'high' ? NUDGE_STYLE.overdue : NUDGE_STYLE.stale)
}

function NudgeRow({ nudge, onDismiss }: { nudge: Nudge; onDismiss: (id: string) => void }) {
  const s = getStyle(nudge)
  const href = nudge.actionHref ?? (nudge.taskId ? `/dashboard/tasks/${nudge.taskId}` : null)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 12px', borderRadius: 9,
      background: s.bg, border: `1px solid ${s.border}`,
      animation: 'nudgeFadeIn 0.2s ease',
    }}>
      <AlertTriangle size={13} style={{ color: s.icon, flexShrink: 0 }} />
      <p style={{ fontSize: 12.5, color: s.text, flex: 1, lineHeight: 1.5, margin: 0 }}>
        {nudge.message}
      </p>
      {href && (
        <Link href={href} style={{ fontSize: 11, color: s.icon, textDecoration: 'none', flexShrink: 0, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {nudge.actionLabel ?? 'View →'}
        </Link>
      )}
      <button onClick={() => onDismiss(nudge.id)} title="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.icon, opacity: 0.5, padding: 2, flexShrink: 0, display: 'flex' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.5'}>
        <X size={12} />
      </button>
    </div>
  )
}

export function NudgePanel({ nudges: initialNudges }: { nudges: Nudge[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)

  function dismiss(id: string) {
    setDismissed(prev => new Set([...prev, id]))
  }

  const visible = initialNudges.filter(n => !dismissed.has(n.id))
  if (visible.length === 0) return null

  const first = visible[0]
  const rest = visible.slice(1)

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Always show first (most critical) nudge */}
      <NudgeRow nudge={first} onDismiss={dismiss} />

      {/* Collapsed rest */}
      {rest.length > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginTop: 5, padding: '5px 10px', borderRadius: 7,
            background: 'rgba(0,0,0,0.04)', border: 'none',
            cursor: 'pointer', fontSize: 12, color: '#888',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <ChevronDown size={13} />
          {rest.length} more alert{rest.length > 1 ? 's' : ''}
        </button>
      )}

      {/* Expanded rest */}
      {rest.length > 0 && expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 5 }}>
          {rest.map(n => <NudgeRow key={n.id} nudge={n} onDismiss={dismiss} />)}
          <button
            onClick={() => setExpanded(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 7, background: 'rgba(0,0,0,0.04)', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888', fontFamily: 'DM Sans, sans-serif', width: 'fit-content' }}
          >
            <ChevronUp size={13} />Show less
          </button>
        </div>
      )}

      <style>{`@keyframes nudgeFadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}`}</style>
    </div>
  )
}
