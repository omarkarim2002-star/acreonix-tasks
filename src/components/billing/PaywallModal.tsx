'use client'
import { useState } from 'react'
import { X, Zap, Check, Loader2 } from 'lucide-react'
import { UPGRADE_REASONS } from '@/lib/plans'

type Reason = keyof typeof UPGRADE_REASONS

type Props = {
  reason: Reason
  onClose: () => void
}

const PLAN_HIGHLIGHTS = {
  pro: [
    'Unlimited projects & tasks',
    'Unlimited AI extracts',
    'Full calendar — week & month views',
    'Time tracker with AI parsing',
    'Daily & weekly AI insights',
    'Full interactive mind maps',
    '7-day free trial',
  ],
  team: [
    'Everything in Pro',
    'Up to 5 team members',
    'Shared projects & calendar',
    'Team insights dashboard',
    'Email invite system',
  ],
}

export function PaywallModal({ reason, onClose }: Props) {
  const [loading, setLoading] = useState<'pro' | 'team' | null>(null)
  const isTeamReason = reason === 'team'

  async function upgrade(plan: 'pro' | 'team') {
    setLoading(plan)
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', plan }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(20,27,45,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'fadeUp 0.2s ease forwards' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#e8f4ee' }}>
              <Zap size={18} style={{ color: '#2d7a4f' }} />
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <X size={18} />
            </button>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Upgrade to unlock this</h2>
          <p className="text-sm text-gray-500">{UPGRADE_REASONS[reason]}</p>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-3">
          {/* Pro */}
          {!isTeamReason && (
            <div className="rounded-xl border-2 p-4" style={{ borderColor: '#2d7a4f', background: 'linear-gradient(135deg, #e8f4ee 0%, #fff 100%)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">Pro</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: '#2d7a4f' }}>7-day free trial</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">For individuals & freelancers</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-gray-900">£12</span>
                  <span className="text-xs text-gray-400">/mo</span>
                </div>
              </div>
              <ul className="space-y-1.5 mb-4">
                {PLAN_HIGHLIGHTS.pro.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-700">
                    <Check size={12} style={{ color: '#2d7a4f', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => upgrade('pro')}
                disabled={!!loading}
                className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: '#2d7a4f' }}
              >
                {loading === 'pro' ? <><Loader2 size={14} className="animate-spin" />Processing…</> : 'Start free trial →'}
              </button>
            </div>
          )}

          {/* Team */}
          <div className="rounded-xl border p-4" style={{ borderColor: '#e8edf2', background: isTeamReason ? 'linear-gradient(135deg, #e8f4ee 0%, #fff 100%)' : '#f8faf9' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-bold text-gray-900">Team</span>
                <p className="text-xs text-gray-500 mt-0.5">For teams up to 5</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-gray-900">£29</span>
                <span className="text-xs text-gray-400">/mo</span>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {PLAN_HIGHLIGHTS.team.map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-700">
                  <Check size={12} style={{ color: '#2d7a4f', flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => upgrade('team')}
              disabled={!!loading}
              className="w-full py-2.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={isTeamReason ? { background: '#2d7a4f', color: '#fff' } : { background: '#e8edf2', color: '#5a6478' }}
            >
              {loading === 'team' ? <><Loader2 size={14} className="animate-spin" />Processing…</> : 'Get Team →'}
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">No credit card required for trial · Cancel anytime</p>
        </div>
      </div>
    </div>
  )
}
