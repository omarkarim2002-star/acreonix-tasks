'use client'

import { useState } from 'react'
import { Users, Globe, Lock, Loader2 } from 'lucide-react'
import { usePlan } from '@/lib/plan-context'
import { useToast } from '@/components/ui/Toast'

type Props = {
  projectId: string
  isShared: boolean
  isOwn: boolean
  onToggle?: (shared: boolean) => void
}

export function ShareProjectButton({ projectId, isShared, isOwn, onToggle }: Props) {
  const { plan } = usePlan()
  const { toast } = useToast()
  const [shared, setShared] = useState(isShared)
  const [loading, setLoading] = useState(false)

  if (!isOwn) {
    // Not the owner — just show read-only badge
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 6,
        background: 'rgba(124,58,237,0.08)',
        border: '1px solid rgba(124,58,237,0.2)',
        fontSize: 12, color: '#7c3aed', fontWeight: 500,
      }}>
        <Users size={12} />Shared project
      </div>
    )
  }

  if (plan !== 'team') return null

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shared_with_team: !shared }),
      })
      if (!res.ok) throw new Error('Failed to update')
      const newShared = !shared
      setShared(newShared)
      onToggle?.(newShared)
      toast(newShared ? 'Project shared with your team' : 'Project is now private')
    } catch {
      toast('Failed to update sharing', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 7,
        background: shared ? 'rgba(124,58,237,0.08)' : 'rgba(0,0,0,0.04)',
        border: `1px solid ${shared ? 'rgba(124,58,237,0.25)' : 'rgba(0,0,0,0.1)'}`,
        color: shared ? '#7c3aed' : '#888',
        fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
        transition: 'all 0.15s',
        fontFamily: 'DM Sans, sans-serif',
      }}
      title={shared ? 'Click to make private' : 'Click to share with team'}
    >
      {loading
        ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
        : shared ? <Globe size={13} /> : <Lock size={13} />
      }
      {shared ? 'Shared with team' : 'Private'}
    </button>
  )
}
