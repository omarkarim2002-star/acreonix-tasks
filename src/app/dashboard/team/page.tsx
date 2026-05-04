'use client'

import { useState, useEffect } from 'react'
import { Users, Plus, Copy, Check, X, Crown, Loader2, UserMinus, Mail, AlertCircle } from 'lucide-react'
import { usePlan } from '@/lib/plan-context'
import { useToast } from '@/components/ui/Toast'
import Link from 'next/link'

type Member = { id: string; user_id: string; email: string; role: string; status: string; joined_at: string }
type Invite = { id: string; email: string; created_at: string; expires_at: string }
type TeamData = { team: { id: string; name: string; owner_id: string } | null; myRole: string; members: Member[]; invites: Invite[] }

function Avatar({ email, size = 32 }: { email: string; size?: number }) {
  const initials = email.split('@')[0].slice(0, 2).toUpperCase()
  const colors = ['#2d7a4f','#3b82f6','#8b5cf6','#ec4899','#f97316','#c9a84c']
  const color = colors[email.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color + '20', border: `1.5px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 600, color, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

export default function TeamPage() {
  const { plan } = usePlan()
  const { toast } = useToast()
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await fetch('/api/teams')
      const d = await res.json()
      setData(d)
    } finally {
      setLoading(false)
    }
  }

  async function createTeam() {
    if (!teamName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast('Team created!')
      setShowCreate(false)
      setTeamName('')
      load()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setCreating(false)
    }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteUrl('')
    try {
      const res = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setInviteUrl(d.inviteUrl)
      setInviteEmail('')
      toast('Invite created!')
      load()
    } catch (e: any) {
      toast(e.message, 'error')
    } finally {
      setInviting(false)
    }
  }

  async function removeMember(memberId: string, email: string) {
    if (!confirm(`Remove ${email} from the team?`)) return
    setRemoving(memberId)
    try {
      const res = await fetch(`/api/teams/members/${memberId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove')
      toast(`${email} removed`)
      load()
    } catch {
      toast('Failed to remove member', 'error')
    } finally {
      setRemoving(null)
    }
  }

  function copyInvite(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast('Invite link copied!')
  }

  const isOwnerOrAdmin = data?.myRole === 'owner' || data?.myRole === 'admin'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Loader2 size={20} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  // Not on team plan
  if (plan !== 'team') return (
    <div style={{ padding: '40px', maxWidth: 560, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '32px', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Users size={24} style={{ color: '#2d7a4f' }} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Team collaboration</h2>
        <p style={{ fontSize: 13, color: '#888', lineHeight: 1.65, marginBottom: 24, maxWidth: 320, margin: '0 auto 24px' }}>
          Invite team members, share projects, and collaborate on tasks together. Available on the Team plan.
        </p>
        <Link href="/dashboard/billing" style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: '#2d7a4f', color: '#fff', padding: '9px 20px',
          borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none',
        }}>
          Upgrade to Team — £29/mo
        </Link>
      </div>
    </div>
  )

  // No team yet — create one
  if (!data?.team) return (
    <div style={{ padding: '40px', maxWidth: 560, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '32px', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Users size={24} style={{ color: '#2d7a4f' }} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Create your team</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Set up a team workspace to collaborate with others.</p>
        {!showCreate ? (
          <button onClick={() => setShowCreate(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: '#2d7a4f', color: '#fff', padding: '9px 20px',
            borderRadius: 8, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
          }}>
            <Plus size={14} />Create team
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, maxWidth: 320, margin: '0 auto' }}>
            <input
              autoFocus
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createTeam()}
              placeholder="Team name…"
              style={{ flex: 1, padding: '8px 11px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, outline: 'none' }}
            />
            <button onClick={createTeam} disabled={!teamName.trim() || creating} style={{
              padding: '8px 16px', background: '#2d7a4f', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
            }}>
              {creating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Create'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // Team exists — show management UI
  return (
    <div style={{ padding: '32px 40px', maxWidth: 700, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: 4 }}>
          {data.team.name}
        </h1>
        <p style={{ fontSize: 13, color: '#888' }}>{data.members.length} member{data.members.length !== 1 ? 's' : ''} · Team plan</p>
        <div style={{ width: 24, height: 2, background: '#c9a84c', borderRadius: 2, marginTop: 8 }} />
      </div>

      {/* Invite section */}
      {isOwnerOrAdmin && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '20px', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Invite a team member</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendInvite()}
              placeholder="colleague@company.com"
              type="email"
              style={{ flex: 1, padding: '8px 11px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, fontSize: 13, outline: 'none' }}
            />
            <button onClick={sendInvite} disabled={!inviteEmail.trim() || inviting} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', background: '#2d7a4f', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
              opacity: !inviteEmail.trim() ? 0.5 : 1,
            }}>
              {inviting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={13} />}
              Send invite
            </button>
          </div>

          {/* Invite URL */}
          {inviteUrl && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0faf4', borderRadius: 8, border: '1px solid #c6e6d4' }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: '#2d7a4f', marginBottom: 5 }}>Share this invite link:</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{ fontSize: 11, color: '#4a4a4a', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  {inviteUrl}
                </code>
                <button onClick={() => copyInvite(inviteUrl)} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', background: '#2d7a4f', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer', flexShrink: 0,
                }}>
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Members list */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Members ({data.members.length})
          </span>
        </div>
        {data.members.map((member, i) => (
          <div key={member.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 20px',
            borderBottom: i < data.members.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
          }}>
            <Avatar email={member.email} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.email}
              </p>
              <p style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>
                {member.joined_at ? `Joined ${new Date(member.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Pending'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {member.role === 'owner' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#fdf8ee', borderRadius: 5 }}>
                  <Crown size={11} style={{ color: '#c9a84c' }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#7a5e1a' }}>Owner</span>
                </div>
              )}
              {member.role === 'member' && (
                <span style={{ fontSize: 11, padding: '3px 8px', background: '#f3f3f1', borderRadius: 5, color: '#888' }}>Member</span>
              )}
              {isOwnerOrAdmin && member.role !== 'owner' && (
                <button onClick={() => removeMember(member.id, member.email)} disabled={removing === member.id} style={{
                  width: 28, height: 28, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc',
                  transition: 'all 0.12s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fff5f5'; (e.currentTarget as HTMLElement).style.color = '#dc2626' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#ccc' }}
                >
                  {removing === member.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <UserMinus size={13} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pending invites */}
      {data.invites.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Pending invites ({data.invites.length})
            </span>
          </div>
          {data.invites.map((invite, i) => (
            <div key={invite.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
              borderBottom: i < data.invites.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              opacity: 0.7,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f3f3f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={14} style={{ color: '#aaa' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: '#4a4a4a' }}>{invite.email}</p>
                <p style={{ fontSize: 11, color: '#bbb' }}>
                  Expires {new Date(invite.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span style={{ fontSize: 11, padding: '3px 8px', background: '#fff4ee', color: '#c2610f', borderRadius: 5, fontWeight: 500 }}>
                Pending
              </span>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
