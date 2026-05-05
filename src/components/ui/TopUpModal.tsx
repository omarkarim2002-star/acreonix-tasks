'use client'

import { useState } from 'react'
import { X, Sparkles, Zap, Loader2, CheckCircle2 } from 'lucide-react'

type Props = {
  onClose: () => void
  creditsUsed: number
  creditsLimit: number
}

export function TopUpModal({ onClose, creditsUsed, creditsLimit }: Props) {
  const [loading, setLoading] = useState<'single' | 'bundle' | null>(null)

  async function checkout(tier: 'single' | 'bundle') {
    setLoading(tier)
    try {
      const res = await fetch('/api/billing/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setLoading(null)
    }
  }

  const S = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(15,23,42,0.5)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, ...S,
      animation: 'fadeIn 0.2s ease',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420,
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#2d7a4f,#1f5537)', padding: '22px 24px 20px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} color="#fff" />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>You've used {creditsUsed} of {creditsLimit} free extracts</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Get more without upgrading your plan</p>
            </div>
          </div>
          {/* Usage bar */}
          <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min((creditsUsed / creditsLimit) * 100, 100)}%`, background: '#c9a84c', borderRadius: 2 }} />
          </div>
        </div>

        {/* Tiers */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Bundle — highlighted */}
          <div style={{ position: 'relative', border: '2px solid #2d7a4f', borderRadius: 12, padding: '16px 18px', background: '#f0faf4', cursor: 'pointer' }}
            onClick={() => !loading && checkout('bundle')}>
            <div style={{ position: 'absolute', top: -10, right: 14, background: '#c9a84c', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, letterSpacing: '0.05em' }}>
              BEST VALUE
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: '#2d7a4f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={18} color="#fff" fill="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 }}>10 extracts</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#2d7a4f', fontWeight: 600 }}>£5.00</span>
                    <span style={{ fontSize: 11, color: '#aaa', textDecoration: 'line-through' }}>£19.90</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#2d7a4f', background: 'rgba(45,122,79,0.1)', padding: '1px 6px', borderRadius: 4 }}>75% off</span>
                  </div>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); checkout('bundle') }}
                disabled={!!loading}
                style={{
                  padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                  background: loading === 'bundle' ? '#e8e8e5' : '#2d7a4f',
                  color: loading === 'bundle' ? '#aaa' : '#fff',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {loading === 'bundle' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {loading === 'bundle' ? 'Loading…' : 'Buy now'}
              </button>
            </div>
          </div>

          {/* Single */}
          <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '14px 18px', background: '#fff', cursor: 'pointer' }}
            onClick={() => !loading && checkout('single')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: '#f3f3f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Sparkles size={16} color="#888" />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>1 extract</p>
                  <p style={{ fontSize: 12, color: '#888' }}>£1.99 · one-time</p>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); checkout('single') }}
                disabled={!!loading}
                style={{
                  padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500,
                  background: 'transparent', border: '1px solid rgba(0,0,0,0.12)',
                  color: '#555', cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {loading === 'single' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {loading === 'single' ? 'Loading…' : 'Buy'}
              </button>
            </div>
          </div>

          {/* Or upgrade */}
          <div style={{ textAlign: 'center', paddingTop: 4 }}>
            <p style={{ fontSize: 12, color: '#aaa' }}>
              Or{' '}
              <a href="/dashboard/billing" style={{ color: '#2d7a4f', fontWeight: 600, textDecoration: 'none' }}>
                upgrade to Pro (£12/mo)
              </a>
              {' '}for unlimited extracts
            </p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}
