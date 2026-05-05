'use client'
import { useState, useEffect } from 'react'
import { CreditCard, Zap, Check, Loader2, ExternalLink, Clock, ShoppingCart } from 'lucide-react'
import { usePlan } from '@/lib/plan-context'
import { PLAN_LIMITS } from '@/lib/plans'

type BillingData = {
  plan: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  trialEnd: string | null
  usage: { aiExtractsUsed: number; periodStart?: string }
  topUpCredits?: number
}

function useCountdown(targetDate: Date | null) {
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    if (!targetDate) return
    function update() {
      const diff = targetDate!.getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Now'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      if (d > 0) setTimeLeft(`${d}d ${h}h`)
      else if (h > 0) setTimeLeft(`${h}h ${m}m`)
      else setTimeLeft(`${m}m`)
    }
    update()
    const iv = setInterval(update, 60000)
    return () => clearInterval(iv)
  }, [targetDate])
  return timeLeft
}

export default function BillingPage() {
  const { plan, refresh } = usePlan()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  function loadData() {
    fetch('/api/billing/plan').then(r => r.json()).then(setData)
  }

  useEffect(() => {
    loadData()
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') || params.get('topup') === 'success') {
      refresh()
      loadData()
      window.history.replaceState({}, '', '/dashboard/billing')
    }
  }, [])

  async function handleAction(action: string, upgradePlan?: string) {
    setLoading(action)
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: upgradePlan ? 'checkout' : 'portal', plan: upgradePlan }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally { setLoading(null) }
  }

  async function handleTopUp(tier: 'single' | 'bundle') {
    setLoading('topup_' + tier)
    try {
      const res = await fetch('/api/billing/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally { setLoading(null) }
  }

  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free
  const aiUsed = data?.usage.aiExtractsUsed ?? 0
  const topUpCredits = data?.topUpCredits ?? 0
  const aiLimit = limits.aiExtractsPerMonth === Infinity ? Infinity : (limits.aiExtractsPerMonth as number)
  const aiLimitDisplay = aiLimit === Infinity ? '∞' : aiLimit
  const aiPct = aiLimit === Infinity ? 0 : Math.min(100, (aiUsed / aiLimit) * 100)
  const isTrialing = data?.status === 'trialing'

  // 28-day reset countdown
  const periodStart = data?.usage.periodStart ? new Date(data.usage.periodStart) : null
  const resetDate = periodStart ? new Date(periodStart.getTime() + 28 * 86400000) : null
  const countdown = useCountdown(resetDate)

  const periodEnd = data?.currentPeriodEnd
    ? new Date(data.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const trialEnd = data?.trialEnd
    ? new Date(data.trialEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
    : null

  const S = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 720, margin: '0 auto', ...S }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: 6 }}>Billing & plan</h1>
        <div style={{ width: 24, height: 2, background: '#c9a84c', borderRadius: 2 }} />
      </div>

      {/* Current plan card */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', padding: '22px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={18} style={{ color: '#2d7a4f' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', textTransform: 'capitalize', marginBottom: 2 }}>{plan} plan</h2>
              {isTrialing && trialEnd && <p style={{ fontSize: 11, color: '#c9a84c' }}>Trial ends {trialEnd}</p>}
              {data?.cancelAtPeriodEnd && periodEnd && <p style={{ fontSize: 11, color: '#ef4444' }}>Cancels {periodEnd}</p>}
              {!isTrialing && periodEnd && !data?.cancelAtPeriodEnd && <p style={{ fontSize: 11, color: '#aaa' }}>Renews {periodEnd}</p>}
            </div>
          </div>
          {plan !== 'free' && (
            <button onClick={() => handleAction('portal')} disabled={!!loading}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#666', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '6px 12px', background: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {loading === 'portal' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <ExternalLink size={12} />}
              Manage
            </button>
          )}
        </div>

        {/* AI extracts usage */}
        <div style={{ marginBottom: aiLimit !== Infinity ? 16 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>AI extracts this month</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {topUpCredits > 0 && (
                <span style={{ fontSize: 11, background: '#f0faf4', color: '#2d7a4f', fontWeight: 600, padding: '2px 7px', borderRadius: 5, border: '1px solid #c6e6d4' }}>
                  +{topUpCredits} credits
                </span>
              )}
              <span style={{ fontSize: 12, color: '#aaa' }}>{aiUsed} / {aiLimitDisplay}</span>
            </div>
          </div>
          <div style={{ height: 6, background: '#f0f0ee', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${aiPct}%`, background: aiPct > 80 ? '#ef4444' : '#2d7a4f', borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>

          {/* 28-day reset countdown — only for free users */}
          {plan === 'free' && countdown && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Clock size={11} style={{ color: '#bbb' }} />
              <span style={{ fontSize: 11, color: '#bbb' }}>
                Resets in <strong style={{ color: '#888' }}>{countdown}</strong>
                {resetDate && (
                  <span style={{ marginLeft: 4 }}>
                    · {resetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16, marginTop: 16 }}>
          {[
            { label: 'Projects', value: limits.projects === Infinity ? 'Unlimited' : `Up to ${limits.projects}` },
            { label: 'Tasks per project', value: (limits as any).tasksPerProject === Infinity ? 'Unlimited' : `Up to ${(limits as any).tasksPerProject}` },
            { label: 'Time tracker', value: (limits as any).timeTracker ? 'Included' : 'Pro+' },
            { label: 'Insights', value: (limits as any).insights ? 'Included' : 'Pro+' },
            { label: 'Calendar views', value: Array.isArray((limits as any).calendarViews) ? (limits as any).calendarViews.join(', ') : 'Included' },
            { label: 'Task history', value: (limits as any).completedHistoryDays === Infinity ? 'Unlimited' : `${(limits as any).completedHistoryDays} days` },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <span style={{ color: '#888' }}>{label}</span>
              <span style={{ fontWeight: 500, color: '#1a1a1a' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Free plan: top-up + upgrade */}
      {plan === 'free' && (
        <>
          {/* Top-up credits section — always visible for free users */}
          <div style={{ background: 'linear-gradient(135deg, #fdf8ee, #fff)', border: '1px solid #e8d5a0', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Zap size={16} style={{ color: '#c9a84c' }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>Need more extracts?</h3>
            </div>
            <p style={{ fontSize: 12.5, color: '#888', marginBottom: 16, lineHeight: 1.55 }}>
              Buy extra AI extract credits without upgrading your plan. Credits never expire.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Single */}
              <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>1 extract</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#2d7a4f', marginBottom: 10, letterSpacing: '-0.03em' }}>£1.99</p>
                <button onClick={() => handleTopUp('single')} disabled={!!loading}
                  style={{ width: '100%', padding: '7px 0', borderRadius: 8, fontSize: 12.5, fontWeight: 500, border: '1px solid rgba(0,0,0,0.12)', background: '#fff', cursor: loading ? 'not-allowed' : 'pointer', color: '#555', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  {loading === 'topup_single' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <ShoppingCart size={12} />}
                  {loading === 'topup_single' ? 'Loading…' : 'Buy'}
                </button>
              </div>
              {/* Bundle */}
              <div style={{ border: '2px solid #2d7a4f', borderRadius: 10, padding: '14px 16px', background: '#f9fdf9', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -10, right: 12, background: '#c9a84c', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>
                  BEST VALUE
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>10 extracts</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#2d7a4f', letterSpacing: '-0.03em' }}>£5.00</span>
                  <span style={{ fontSize: 11, color: '#bbb', textDecoration: 'line-through' }}>£19.90</span>
                </div>
                <button onClick={() => handleTopUp('bundle')} disabled={!!loading}
                  style={{ width: '100%', padding: '7px 0', borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: 'none', background: loading === 'topup_bundle' ? '#e8e8e5' : '#2d7a4f', cursor: loading ? 'not-allowed' : 'pointer', color: loading === 'topup_bundle' ? '#aaa' : '#fff', fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  {loading === 'topup_bundle' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={12} />}
                  {loading === 'topup_bundle' ? 'Loading…' : 'Buy bundle'}
                </button>
              </div>
            </div>
          </div>

          {/* Upgrade cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { name: 'Pro', price: '£12', plan: 'pro', highlight: true, features: ['Unlimited projects & tasks', 'Unlimited AI extracts', 'Week & month calendar', 'Time tracker', 'AI insights', '7-day free trial'] },
              { name: 'Team', price: '£29', plan: 'team', highlight: false, features: ['Everything in Pro', 'Up to 5 members', 'Shared projects', 'Shared calendar', 'Team insights'] },
            ].map(tier => (
              <div key={tier.name} style={{ background: '#fff', borderRadius: 14, border: `${tier.highlight ? '2px' : '1px'} solid ${tier.highlight ? '#2d7a4f' : 'rgba(0,0,0,0.08)'}`, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 3 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.03em' }}>{tier.price}</span>
                  <span style={{ fontSize: 11, color: '#aaa' }}>/month</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>{tier.name}</p>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: 16 }}>
                  {tier.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#555', marginBottom: 6 }}>
                      <Check size={11} style={{ color: '#2d7a4f', flexShrink: 0 }} />{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleAction('upgrade', tier.plan)} disabled={!!loading}
                  style={{ width: '100%', padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 600, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', background: tier.highlight ? '#2d7a4f' : '#f3f3f1', color: tier.highlight ? '#fff' : '#555' }}>
                  {loading === tier.plan ? 'Loading…' : `Upgrade to ${tier.name}`}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {plan === 'pro' && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)', padding: '18px 22px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Need team collaboration?</h3>
          <p style={{ fontSize: 12.5, color: '#888', marginBottom: 14, lineHeight: 1.55 }}>Upgrade to Team for shared projects, calendar, and insights across up to 5 members.</p>
          <button onClick={() => handleAction('upgrade', 'team')} disabled={!!loading}
            style={{ fontSize: 13, fontWeight: 600, padding: '9px 20px', borderRadius: 9, background: '#2d7a4f', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            {loading === 'team' ? 'Loading…' : 'Upgrade to Team — £29/mo'}
          </button>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
