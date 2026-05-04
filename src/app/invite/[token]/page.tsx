'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Loader2, CheckCircle2, XCircle, Users } from 'lucide-react'
import Link from 'next/link'

export default function InvitePage() {
  const { token } = useParams()
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'accepting' | 'success' | 'error' | 'signin'>('loading')
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoaded) return
    if (!user) {
      // Store token and redirect to sign-in
      sessionStorage.setItem('pending_invite', token as string)
      setStatus('signin')
      return
    }
    acceptInvite()
  }, [isLoaded, user]) // eslint-disable-line

  async function acceptInvite() {
    setStatus('accepting')
    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTeamName(data.teamName)
      setStatus('success')
      setTimeout(() => router.push('/dashboard/team'), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to accept invite')
      setStatus('error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f7f7f5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: '36px 32px',
        width: '100%', maxWidth: 400, textAlign: 'center',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        {(status === 'loading' || status === 'accepting') && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Loader2 size={22} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Joining team…</h2>
            <p style={{ fontSize: 13, color: '#888' }}>Setting up your access</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={22} style={{ color: '#2d7a4f' }} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>You're in!</h2>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Welcome to <strong>{teamName}</strong>. Redirecting…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <XCircle size={22} style={{ color: '#dc2626' }} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Invite failed</h2>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>{error}</p>
            <Link href="/dashboard" style={{
              display: 'inline-flex', padding: '8px 20px', background: '#2d7a4f', color: '#fff',
              borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none',
            }}>Go to dashboard</Link>
          </>
        )}

        {status === 'signin' && (
          <>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Users size={22} style={{ color: '#2d7a4f' }} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>You've been invited</h2>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Sign in or create an account to accept your team invitation.</p>
            <Link href={`/sign-in?redirect_url=/invite/${token}`} style={{
              display: 'block', padding: '9px 0', background: '#2d7a4f', color: '#fff',
              borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', marginBottom: 8,
            }}>Sign in</Link>
            <Link href={`/sign-up?redirect_url=/invite/${token}`} style={{
              display: 'block', padding: '9px 0', background: '#f7f7f5', color: '#4a4a4a',
              borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none',
              border: '1px solid rgba(0,0,0,0.09)',
            }}>Create account</Link>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
