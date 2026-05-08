'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePlan } from '@/lib/usePlan'
import { Check, Zap, ExternalLink, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const PLANS = [
  {
    id: 'free', name: 'Free', price: '£0', period: 'forever',
    features: ['5 AI extracts / month', '3 projects', "Today's focus", 'Basic insights'],
  },
  {
    id: 'pro', name: 'Pro', price: '£12', period: 'per month', popular: true,
    features: ['Unlimited AI extracts', 'Unlimited projects', 'AI scheduling', 'Full insights', 'Time tracking'],
  },
  {
    id: 'team', name: 'Team', price: '£29', period: 'per month',
    features: ['Everything in Pro', 'Team collaboration', 'Shared projects', 'Admin controls'],
  },
]

const TOPUPS = [
  { label: '10 extracts', price: '£2.99', tier: 'pack_10' },
  { label: '30 extracts', price: '£7.99', tier: 'pack_30', popular: true },
  { label: '100 extracts', price: '£19.99', tier: 'pack_100' },
]

export default function BillingPage() {
  const plan           = usePlan()
  const searchParams   = useSearchParams()
  const success        = searchParams.get('success')
  const cancelled      = searchParams.get('cancelled')
  const [loading, setLoading] = useState<string | null>(null)

  async function checkout(tier: string) {
    setLoading(tier)
    try {
      const res  = await fetch('/api/billing/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error ?? 'Something went wrong')
    } catch { alert('Something went wrong') }
    finally { setLoading(null) }
  }

  async function openPortal() {
    setLoading('portal')
    try {
      const res  = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error ?? 'No billing account found')
    } catch { alert('Something went wrong') }
    finally { setLoading(null) }
  }

  const creditsDisplay = plan.unlimited ? '∞' : String(plan.creditsLeft)
  const resetDate = plan.periodStart
    ? new Date(new Date(plan.periodStart).setMonth(new Date(plan.periodStart).getMonth() + 1))
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-2">
        <Link href="/dashboard/account" className="text-sm" style={{ color: '#9BA5A0' }}>← Account</Link>
      </div>
      <h1 className="text-4xl font-black tracking-tight mb-6" style={{ color: '#101312', letterSpacing: '-0.5px' }}>
        Plan & billing
      </h1>

      {/* Success / cancelled banners */}
      {success && (
        <div className="rounded-xl p-4 mb-6 text-sm font-medium" style={{ background: '#EAF4EF', color: '#0D3D2E' }}>
          ✓ Payment successful — your plan has been updated.
        </div>
      )}
      {cancelled && (
        <div className="rounded-xl p-4 mb-6 text-sm" style={{ background: '#FEF3C7', color: '#92400E' }}>
          Payment cancelled. No charge was made.
        </div>
      )}

      {/* Current plan status */}
      {!plan.loading && (
        <div className="rounded-2xl p-5 mb-6 flex items-center gap-6 flex-wrap" style={{ background: '#EAF4EF' }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold mb-1" style={{ color: '#0D3D2E', letterSpacing: '0.8px' }}>CURRENT PLAN</p>
            <p className="text-2xl font-black" style={{ color: '#0D3D2E' }}>{plan.label}</p>
          </div>
          <div className="text-center px-6" style={{ borderLeft: '1px solid rgba(13,61,46,0.15)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#0D3D2E', letterSpacing: '0.8px' }}>AI EXTRACTS</p>
            <p className="text-3xl font-black" style={{ color: !plan.unlimited && plan.creditsLeft < 3 ? '#DC2626' : '#0D3D2E' }}>
              {creditsDisplay}
            </p>
            <p className="text-xs" style={{ color: 'rgba(13,61,46,0.6)' }}>{plan.unlimited ? 'unlimited' : 'remaining'}</p>
          </div>
          {resetDate && !plan.unlimited && (
            <div className="text-center px-6" style={{ borderLeft: '1px solid rgba(13,61,46,0.15)' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#0D3D2E', letterSpacing: '0.8px' }}>RESETS</p>
              <p className="text-sm font-semibold" style={{ color: '#0D3D2E' }}>{resetDate}</p>
            </div>
          )}
          {/* Manage subscription — shown for paid plans */}
          {plan.plan !== 'free' && (
            <button onClick={openPortal} disabled={loading === 'portal'}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl transition-all"
              style={{ background: 'rgba(13,61,46,0.12)', color: '#0D3D2E' }}>
              {loading === 'portal'
                ? <RefreshCw size={13} className="animate-spin" />
                : <ExternalLink size={13} />}
              Manage subscription
            </button>
          )}
        </div>
      )}

      {/* Top-up packs — free plan only */}
      {!plan.loading && plan.plan === 'free' && (
        <div className="mb-8">
          <h2 className="text-base font-bold mb-1" style={{ color: '#101312' }}>Buy more extracts</h2>
          <p className="text-sm mb-4" style={{ color: '#9BA5A0' }}>One-time purchase — no subscription</p>
          <div className="grid grid-cols-3 gap-3">
            {TOPUPS.map(t => (
              <button key={t.tier} onClick={() => checkout(t.tier)} disabled={!!loading}
                className="rounded-2xl p-4 text-left transition-all hover:shadow-md relative"
                style={{
                  background: t.popular ? '#0D3D2E' : '#fff',
                  boxShadow: '0 2px 8px rgba(16,19,18,0.06)',
                  border: t.popular ? 'none' : '1px solid #EEEEE8',
                  opacity: loading && loading !== t.tier ? 0.6 : 1,
                }}>
                {t.popular && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full absolute -top-2 left-4"
                    style={{ background: '#D7F36A', color: '#071F17' }}>Best value</span>
                )}
                <p className="text-sm font-bold mb-1" style={{ color: t.popular ? '#fff' : '#101312' }}>{t.label}</p>
                <p className="text-xl font-black" style={{ color: t.popular ? '#D7F36A' : '#0D3D2E' }}>{t.price}</p>
                {loading === t.tier && (
                  <RefreshCw size={14} className="animate-spin absolute bottom-4 right-4"
                    style={{ color: t.popular ? '#D7F36A' : '#9BA5A0' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Plan comparison */}
      <h2 className="text-base font-bold mb-4" style={{ color: '#101312' }}>
        {plan.plan === 'free' ? 'Upgrade your plan' : 'All plans'}
      </h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {PLANS.map(p => {
          const isCurrent = plan.plan === p.id
          return (
            <div key={p.id} className="rounded-2xl p-5 flex flex-col"
              style={{
                background: p.popular ? '#0D3D2E' : '#fff',
                boxShadow: p.popular ? '0 8px 24px rgba(13,61,46,0.25)' : '0 2px 8px rgba(16,19,18,0.06)',
                border: isCurrent ? '2px solid #0D3D2E' : '2px solid transparent',
              }}>
              {p.popular && !isCurrent && (
                <div className="text-xs font-bold mb-3 px-2 py-0.5 rounded-full self-start"
                  style={{ background: '#D7F36A', color: '#071F17' }}>MOST POPULAR</div>
              )}
              {isCurrent && (
                <div className="text-xs font-bold mb-3 px-2 py-0.5 rounded-full self-start"
                  style={{ background: p.popular ? '#D7F36A22' : '#EAF4EF', color: p.popular ? '#D7F36A' : '#0D3D2E' }}>
                  YOUR PLAN ✓
                </div>
              )}
              <h3 className="text-lg font-black mb-1" style={{ color: p.popular ? '#fff' : '#101312' }}>{p.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-black" style={{ color: p.popular ? '#D7F36A' : '#0D3D2E' }}>{p.price}</span>
                <span className="text-xs" style={{ color: p.popular ? 'rgba(255,255,255,0.5)' : '#9BA5A0' }}>/ {p.period}</span>
              </div>
              <div className="flex-1 space-y-2 mb-5">
                {p.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check size={12} style={{ color: p.popular ? '#D7F36A' : '#0D3D2E', flexShrink: 0 }} />
                    <span className="text-xs" style={{ color: p.popular ? 'rgba(255,255,255,0.75)' : '#66706B' }}>{f}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => !isCurrent && p.id !== 'free' && checkout(p.id)}
                disabled={isCurrent || p.id === 'free' || !!loading}
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: isCurrent ? (p.popular ? 'rgba(215,243,106,0.15)' : '#EAF4EF')
                    : p.popular ? '#D7F36A' : '#0D3D2E',
                  color: isCurrent ? (p.popular ? '#D7F36A' : '#0D3D2E')
                    : p.popular ? '#071F17' : '#fff',
                  opacity: (p.id === 'free' || (!!loading && loading !== p.id)) ? 0.6 : 1,
                  cursor: isCurrent || p.id === 'free' ? 'default' : 'pointer',
                }}>
                {loading === p.id
                  ? <RefreshCw size={13} className="animate-spin" />
                  : isCurrent ? 'Current plan'
                  : p.id === 'free' ? 'Free forever'
                  : <><Zap size={13} />Upgrade to {p.name}</>}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-center" style={{ color: '#C8D0CC' }}>
        Payments processed by Stripe · Cancel anytime ·{' '}
        <a href="mailto:hello@acreonix.co.uk" style={{ color: '#9BA5A0' }}>Contact support</a>
      </p>
    </div>
  )
}
