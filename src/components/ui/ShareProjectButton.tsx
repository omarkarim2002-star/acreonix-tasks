'use client'

import { useState } from 'react'
import { Users, Globe, Lock, Loader2, Share2, X } from 'lucide-react'
import { usePlan } from '@/lib/plan-context'
import { useToast } from '@/components/ui/Toast'

type SharingType = 'private' | 'pro_share' | 'team_share'

type Props = {
  projectId: string
  sharingType: SharingType
  isOwn: boolean
  onUpdate?: (type: SharingType) => void
}

const SHARE_STYLES = {
  private:    { label: 'Private',           bg: 'rgba(0,0,0,0.04)',    border: 'rgba(0,0,0,0.1)',    color: '#888',    icon: Lock },
  pro_share:  { label: 'Shared (Pro)',      bg: 'rgba(124,58,237,.08)', border: 'rgba(124,58,237,.25)', color: '#7c3aed', icon: Share2 },
  team_share: { label: 'Shared (Team)',     bg: 'rgba(37,99,235,.08)',  border: 'rgba(37,99,235,.25)', color: '#2563eb', icon: Users },
}

export function ShareProjectButton({ projectId, sharingType, isOwn, onUpdate }: Props) {
  const { plan } = usePlan()
  const { toast } = useToast()
  const [current, setCurrent] = useState<SharingType>(sharingType)
  const [loading, setLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showInviteInput, setShowInviteInput] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')

  if (!isOwn) {
    const style = SHARE_STYLES[current]
    const Icon = style.icon
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 6,
        background: style.bg, border: `1px solid ${style.border}`,
        fontSize: 12, color: style.color, fontWeight: 500,
      }}>
        <Icon size={12} />{style.label}
      </div>
    )
  }

  if (plan === 'free') return null

  async function setSharingType(type: SharingType) {
    setLoading(true)
    setShowMenu(false)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharing_type: type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCurrent(type)
      onUpdate?.(type)
      toast(type === 'private' ? 'Project is now private' : type === 'team_share' ? 'Shared with your team' : 'Project set to Pro sharing')
      if (type === 'pro_share') setShowInviteInput(true)
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function sendProShareInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetch('/api/projects/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, email: inviteEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setInviteUrl(data.inviteUrl)
      setInviteEmail('')
      toast('Invite created — share the link below')
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setInviting(false)
    }
  }

  const style = SHARE_STYLES[current]
  const Icon = style.icon

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(m => !m)}
        disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 7,
          background: style.bg, border: `1px solid ${style.border}`,
          color: style.color, fontSize: 12.5, fontWeight: 500,
          cursor: 'pointer', transition: 'all 0.15s',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon size={13} />}
        {style.label}
      </button>

      {showMenu && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6,
          background: '#fff', border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 10, padding: 6, minWidth: 200,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50,
          fontFamily: 'DM Sans, sans-serif',
        }}>

          {/* Private */}
          <button onClick={() => setSharingType('private')} style={{
            width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 7,
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            background: current === 'private' ? '#f3f3f1' : 'transparent',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            <Lock size={13} style={{ color: '#888', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>Private</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>Only you can see this</div>
            </div>
          </button>

          {/* Pro share — available on Pro plan */}
          {(plan === 'pro' || plan === 'team') && (
            <button onClick={() => setSharingType('pro_share')} style={{
              width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 7,
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              background: current === 'pro_share' ? 'rgba(124,58,237,.06)' : 'transparent',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              <Share2 size={13} style={{ color: '#7c3aed', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>Share with Pro user <span style={{ fontSize: 10, background: 'rgba(124,58,237,.1)', color: '#7c3aed', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>Purple</span></div>
                <div style={{ fontSize: 11, color: '#aaa' }}>Invite another Pro user (max 5)</div>
              </div>
            </button>
          )}

          {/* Team share — Team plan only */}
          {plan === 'team' && (
            <button onClick={() => setSharingType('team_share')} style={{
              width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 7,
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              background: current === 'team_share' ? 'rgba(37,99,235,.06)' : 'transparent',
              fontFamily: 'DM Sans, sans-serif',
            }}>
              <Users size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>Share with team <span style={{ fontSize: 10, background: 'rgba(37,99,235,.1)', color: '#2563eb', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>Blue</span></div>
                <div style={{ fontSize: 11, color: '#aaa' }}>All your team members can access</div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Pro share invite input */}
      {showInviteInput && current === 'pro_share' && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6,
          background: '#fff', border: '1px solid rgba(124,58,237,.2)',
          borderRadius: 10, padding: 14, width: 280,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 50,
          fontFamily: 'DM Sans, sans-serif',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed' }}>Invite a Pro user</span>
            <button onClick={() => setShowInviteInput(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={14} /></button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendProShareInvite()}
              placeholder="their@email.com"
              type="email"
              style={{ flex: 1, padding: '7px 10px', border: '1px solid rgba(0,0,0,.12)', borderRadius: 7, fontSize: 12.5, outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
            />
            <button onClick={sendProShareInvite} disabled={!inviteEmail.trim() || inviting} style={{
              padding: '7px 12px', background: '#7c3aed', color: '#fff',
              border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}>
              {inviting ? '...' : 'Invite'}
            </button>
          </div>
          {inviteUrl && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(124,58,237,.05)', borderRadius: 7, border: '1px solid rgba(124,58,237,.15)' }}>
              <p style={{ fontSize: 10, color: '#7c3aed', fontWeight: 600, marginBottom: 4 }}>Share this link:</p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <code style={{ fontSize: 10, color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inviteUrl}</code>
                <button onClick={() => { navigator.clipboard.writeText(inviteUrl); toast('Copied!') }}
                  style={{ padding: '3px 8px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 5, fontSize: 10, cursor: 'pointer' }}>
                  Copy
                </button>
              </div>
            </div>
          )}
          <p style={{ fontSize: 10, color: '#bbb', marginTop: 8 }}>The invitee must have a Pro plan to access this project.</p>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
