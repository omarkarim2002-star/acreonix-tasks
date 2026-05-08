'use client'

import { useUser } from '@clerk/nextjs'
import { Check, Zap } from 'lucide-react'
import Link from 'next/link'

const PLANS = [
  {
    id:'free', name:'Free', price:'£0', period:'forever',
    features:['5 AI extracts / month','3 projects','Today\'s focus','Basic insights'],
    cta:'Current plan', current:true,
  },
  {
    id:'pro', name:'Pro', price:'£12', period:'per month', popular:true,
    features:['Unlimited AI extracts','Unlimited projects','AI scheduling','Full insights','Priority support'],
    cta:'Upgrade to Pro', current:false,
  },
  {
    id:'team', name:'Team', price:'£29', period:'per month',
    features:['Everything in Pro','Team collaboration','Shared projects','Admin controls'],
    cta:'Upgrade to Team', current:false,
  },
]

export default function BillingPage() {
  const { user } = useUser()

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <div className="mb-2">
        <Link href="/dashboard/account" className="text-sm font-medium" style={{ color:'#9BA5A0' }}>← Account</Link>
      </div>
      <h1 className="text-4xl font-black tracking-tight mb-2" style={{ color:'#101312', letterSpacing:'-0.5px' }}>Plan & billing</h1>
      <p className="text-sm mb-8" style={{ color:'#9BA5A0' }}>You're on the <strong style={{ color:'#0D3D2E' }}>Free</strong> plan</p>

      <div className="grid grid-cols-3 gap-4">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className="rounded-2xl p-5 flex flex-col"
            style={{
              background: plan.popular ? '#0D3D2E' : '#fff',
              boxShadow: plan.popular ? '0 8px 24px rgba(13,61,46,0.25)' : '0 2px 8px rgba(16,19,18,0.06)',
              border: plan.current ? '2px solid #0D3D2E' : '2px solid transparent',
            }}
          >
            {plan.popular && (
              <div className="text-xs font-bold mb-3 px-2 py-0.5 rounded-full self-start" style={{ background:'#D7F36A', color:'#071F17' }}>
                MOST POPULAR
              </div>
            )}
            <h3 className="text-lg font-black mb-1" style={{ color: plan.popular ? '#fff' : '#101312' }}>{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-black" style={{ color: plan.popular ? '#D7F36A' : '#0D3D2E' }}>{plan.price}</span>
              <span className="text-xs" style={{ color: plan.popular ? 'rgba(255,255,255,0.5)' : '#9BA5A0' }}>/ {plan.period}</span>
            </div>

            <div className="flex-1 space-y-2 mb-5">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check size={13} style={{ color: plan.popular ? '#D7F36A' : '#0D3D2E', flexShrink:0 }} />
                  <span className="text-xs" style={{ color: plan.popular ? 'rgba(255,255,255,0.75)' : '#66706B' }}>{f}</span>
                </div>
              ))}
            </div>

            <button
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: plan.current ? '#EAF4EF' : plan.popular ? '#D7F36A' : '#0D3D2E',
                color:      plan.current ? '#0D3D2E'  : plan.popular ? '#071F17'  : '#fff',
                opacity:    plan.current ? 0.7 : 1,
                cursor:     plan.current ? 'default' : 'pointer',
              }}
              disabled={plan.current}
            >
              {plan.current ? 'Current plan' : <span className="flex items-center justify-center gap-1.5"><Zap size={13} />{plan.cta}</span>}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-center mt-6" style={{ color:'#C8D0CC' }}>
        Billing powered by Stripe · Cancel anytime · <a href="mailto:hello@acreonix.co.uk" style={{ color:'#9BA5A0' }}>Contact support</a>
      </p>
    </div>
  )
}
