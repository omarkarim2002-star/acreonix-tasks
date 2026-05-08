'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { usePlan } from '@/lib/usePlan'
import { Check, Zap, RefreshCw } from 'lucide-react'
import Link from 'next/link'

const PLANS = [
  {
    id: 'free', name: 'Free', price: '£0', period: 'forever',
    features: ['5 AI extracts / month', '3 projects', "Today's focus", 'Basic insights', 'Calendar view'],
    cta: 'Current plan',
  },
  {
    id: 'pro', name: 'Pro', price: '£12', period: 'per month', popular: true,
    features: ['Unlimited AI extracts', 'Unlimited projects', 'AI scheduling', 'Full insights', 'Priority support', 'Time tracking'],
    cta: 'Upgrade to Pro',
  },
  {
    id: 'team', name: 'Team', price: '£29', period: 'per month',
    features: ['Everything in Pro', 'Team collaboration', 'Shared projects', 'Admin controls', 'Audit log'],
    cta: 'Upgrade to Team',
  },
]

const TOPUPS = [
  { label: '10 extracts', price: '£2.99', tier: 'pack_10' },
  { label: '30 extracts', price: '£7.99', tier: 'pack_30', popular: true },
  { label: '100 extracts', price: '£19.99', tier: 'pack_100' },
]

export default function BillingPage() {
  const { user }          = useUser()
  const plan              = usePlan()
  const [topping, setTopping] = useState<string | null>(null)

  async function handleTopup(tier: string) {
    setTopping(tier)
    try {
      const res = await fetch('/api/billing/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch { setTopping(null) }
  }

  const creditsDisplay = plan.unlimited ? '∞' : String(plan.creditsLeft)
  const creditsLow     = !plan.unlimited && plan.creditsLeft < 3

  const resetDate = plan.periodStart
    ? new Date(new Date(plan.periodStart).setMonth(new Date(plan.periodStart).getMonth() + 1))
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-2">
        <Link href="/dashboard/account" className="text-sm" style={{ color: '#9BA5A0' }}>← Account</Link>
      </div>
      <h1 className="text-4xl font-black tracking-tight mb-2" style={{ color: '#101312', letterSpacing: '-0.5px' }}>
        Plan & billing
      </h1>

      {/* Current plan card */}
      {!plan.loading && (
        <div className="rounded-2xl p-5 mb-8 flex items-center gap-6" style={{ background: '#EAF4EF' }}>
          <div className="flex-1">
            <p className="text-xs font-bold mb-1" style={{ color: '#0D3D2E', letterSpacing: '0.8px' }}>CURRENT PLAN</p>
            <p className="text-2xl font-black" style={{ color: '#0D3D2E' }}>{plan.label}</p>
          </div>
          <div className="text-center px-6 border-l" style={{ borderColor: 'rgba(13,61,46,0.15)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#0D3D2E', letterSpacing: '0.8px' }}>AI EXTRACTS</p>
            <p className="text-3xl font-black" style={{ color: creditsLow ? '#DC2626' : '#0D3D2E' }}>
              {creditsDisplay}
            </p>
            <p className="text-xs" style={{ color: 'rgba(13,61,46,0.6)' }}>
              {plan.unlimited ? 'unlimited' : 'remaining'}
            </p>
          </div>
          {resetDate && !plan.unlimited && (
            <div className="text-center px-6 border-l" style={{ borderColor: 'rgba(13,61,46,0.15)' }}>
              <p className="text-xs font-bold mb-1" style={{ color: '#0D3D2E', letterSpacing: '0.8px' }}>RESETS</p>
              <p className="text-sm font-semibold" style={{ color: '#0D3D2E' }}>{resetDate}</p>
            </div>
          )}
        </div>
      )}

      {/* Top-up packs — free users only */}
      {!plan.loading && plan.plan === 'free' && (
        <div className="mb-8">
          <h2 className="text-base font-bold mb-1" style={{ color: '#101312' }}>Buy more extracts</h2>
          <p className="text-sm mb-4" style={{ color: '#9BA5A0' }}>One-time purchase — no subscription needed</p>
          <div className="grid grid-cols-3 gap-3">
            {TOPUPS.map(t => (
              <button key={t.tier} onClick={() => handleTopup(t.tier)}
                disabled={topping === t.tier}
                className="rounded-2xl p-4 text-left transition-all hover:shadow-md relative"
                style={{
                  background: t.popular ? '#0D3D2E' : '#fff',
                  boxShadow: '0 2px 8px rgba(16,19,18,0.06)',
                  border: t.popular ? 'none' : '1px solid #EEEEE8',
                }}>
                {t.popular && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full absolute -top-2 left-4"
                    style={{ background: '#D7F36A', color: '#071F17' }}>Best value</span>
                )}
                <p className="text-sm font-bold mb-1" style={{ color: t.popular ? '#fff' : '#101312' }}>{t.label}</p>
                <p className="text-xl font-black" style={{ color: t.popular ? '#D7F36A' : '#0D3D2E' }}>{t.price}</p>
                {topping === t.tier && (
                  <RefreshCw size={14} className="animate-spin absolute bottom-4 right-4"
                    style={{ color: t.popular ? '#D7F36A' : '#9BA5A0' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Plan comparison */}
      <h2 className="text-base font-bold mb-4" style={{ color: '#101312' }}>Plans</h2>
      <div className="grid grid-cols-3 gap-4">
        {PLANS.map(p => {
          const isCurrent = plan.plan === p.id
          return (
            <div key={p.id} className="rounded-2xl p-5 flex flex-col"
              style={{
                background: p.popular ? '#0D3D2E' : '#fff',
                boxShadow: p.popular ? '0 8px 24px rgba(13,61,46,0.25)' : '0 2px 8px rgba(16,19,18,0.06)',
                border: isCurrent ? '2px solid #0D3D2E' : '2px solid transparent',
              }}>
              {p.popular && (
                <div className="text-xs font-bold mb-3 px-2 py-0.5 rounded-full self-start"
                  style={{ background: '#D7F36A', color: '#071F17' }}>MOST POPULAR</div>
              )}
              {isCurrent && !p.popular && (
                <div className="text-xs font-bold mb-3 px-2 py-0.5 rounded-full self-start"
                  style={{ background: '#EAF4EF', color: '#0D3D2E' }}>YOUR PLAN</div>
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
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: isCurrent ? '#EAF4EF' : p.popular ? '#D7F36A' : '#0D3D2E',
                  color:      isCurrent ? '#0D3D2E'  : p.popular ? '#071F17'  : '#fff',
                  opacity:    isCurrent ? 0.7 : 1,
                  cursor:     isCurrent ? 'default' : 'pointer',
                }}
                disabled={isCurrent}
              >
                {isCurrent ? 'Current plan'
                  : <span className="flex items-center justify-center gap-1.5"><Zap size={13} />{p.cta}</span>}
              </button>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-center mt-6" style={{ color: '#C8D0CC' }}>
        Billing powered by Stripe · Cancel anytime ·{' '}
        <a href="mailto:hello@acreonix.co.uk" style={{ color: '#9BA5A0' }}>Contact support</a>
      </p>
    </div>
  )
}
