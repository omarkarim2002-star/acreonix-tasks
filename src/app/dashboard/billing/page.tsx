'use client'
import { useState, useEffect } from 'react'
import { CreditCard, Zap, Check, Loader2, ExternalLink, AlertCircle } from 'lucide-react'
import { usePlan } from '@/lib/plan-context'
import { PLAN_LIMITS } from '@/lib/plans'

type BillingData = {
  plan: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  trialEnd: string | null
  usage: { aiExtractsUsed: number }
}

export default function BillingPage() {
  const { plan, refresh } = usePlan()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/billing/plan').then(r => r.json()).then(setData)

    // Handle success/cancel redirects
    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) {
      refresh()
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
    } finally {
      setLoading(null)
    }
  }

  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free
  const aiUsed = data?.usage.aiExtractsUsed ?? 0
  const aiLimit = limits.aiExtractsPerMonth === Infinity ? '∞' : limits.aiExtractsPerMonth
  const aiPct = limits.aiExtractsPerMonth === Infinity ? 0 : Math.min(100, (aiUsed / limits.aiExtractsPerMonth) * 100)

  const periodEnd = data?.currentPeriodEnd ? new Date(data.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const trialEnd = data?.trialEnd ? new Date(data.trialEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : null
  const isTrialing = data?.status === 'trialing'

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Billing & plan</h1>
        <p className="text-sm text-gray-400">Manage your subscription and usage</p>
      </div>

      {/* Current plan */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#e8f4ee' }}>
              <CreditCard size={18} style={{ color: '#2d7a4f' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 capitalize">{plan} plan</h2>
              {isTrialing && trialEnd && (
                <p className="text-xs text-[#c9a84c]">Trial ends {trialEnd}</p>
              )}
              {data?.cancelAtPeriodEnd && periodEnd && (
                <p className="text-xs text-red-500">Cancels {periodEnd}</p>
              )}
              {!isTrialing && periodEnd && !data?.cancelAtPeriodEnd && (
                <p className="text-xs text-gray-400">Renews {periodEnd}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {plan !== 'free' && (
              <button
                onClick={() => handleAction('portal')}
                disabled={!!loading}
                className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {loading === 'portal' ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
                Manage
              </button>
            )}
          </div>
        </div>

        {/* Usage — AI extracts */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-600">AI extracts this month</span>
            <span className="text-xs text-gray-400">{aiUsed} / {aiLimit}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${aiPct}%`, background: aiPct > 80 ? '#ef4444' : '#2d7a4f' }}
            />
          </div>
        </div>

        {/* Feature checklist */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Projects', value: limits.projects === Infinity ? 'Unlimited' : `Up to ${limits.projects}` },
            { label: 'Tasks per project', value: limits.tasksPerProject === Infinity ? 'Unlimited' : `Up to ${limits.tasksPerProject}` },
            { label: 'Time tracker', value: limits.timeTracker ? 'Included' : 'Pro+' },
            { label: 'Insights', value: limits.insights ? 'Included' : 'Pro+' },
            { label: 'Calendar views', value: limits.calendarViews.join(', ') },
            { label: 'Task history', value: limits.completedHistoryDays === Infinity ? 'Unlimited' : `${limits.completedHistoryDays} days` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade cards — only show if not on highest plan */}
      {plan === 'free' && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'Pro', price: '£12', period: '/month', plan: 'pro', highlight: true, features: ['Unlimited projects & tasks', 'Unlimited AI extracts', 'Week & month calendar', 'Time tracker', 'AI insights', '7-day free trial'] },
            { name: 'Team', price: '£29', period: '/month', plan: 'team', highlight: false, features: ['Everything in Pro', 'Up to 5 members', 'Shared projects', 'Shared calendar', 'Team insights'] },
          ].map(tier => (
            <div key={tier.name} className={`bg-white rounded-2xl border p-5 ${tier.highlight ? 'border-[#2d7a4f]' : 'border-gray-200'}`}>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-xl font-bold text-gray-900">{tier.price}</span>
                <span className="text-xs text-gray-400">{tier.period}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-3">{tier.name}</p>
              <ul className="space-y-1.5 mb-4">
                {tier.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <Check size={11} style={{ color: '#2d7a4f', flexShrink: 0 }} />{f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleAction('upgrade', tier.plan)}
                disabled={!!loading}
                className="w-full py-2 text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
                style={tier.highlight ? { background: '#2d7a4f', color: '#fff' } : { background: '#f4f6f8', color: '#5a6478' }}
              >
                {loading === tier.plan ? 'Loading…' : `Upgrade to ${tier.name}`}
              </button>
            </div>
          ))}
        </div>
      )}

      {plan === 'pro' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Need team collaboration?</h3>
          <p className="text-xs text-gray-500 mb-4">Upgrade to Team for shared projects, calendar, and insights across up to 5 members.</p>
          <button
            onClick={() => handleAction('upgrade', 'team')}
            disabled={!!loading}
            className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all disabled:opacity-50"
            style={{ background: '#2d7a4f' }}
          >
            {loading === 'team' ? 'Loading…' : 'Upgrade to Team — £29/mo'}
          </button>
        </div>
      )}
    </div>
  )
}
