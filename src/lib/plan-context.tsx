'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Plan } from '@/lib/plans'
import { PLAN_LIMITS, UPGRADE_REASONS, canUseFeature } from '@/lib/plans'

type Limits = typeof PLAN_LIMITS['free'] | typeof PLAN_LIMITS['pro'] | typeof PLAN_LIMITS['team']

type PlanContext = {
  plan: Plan
  limits: Limits
  loading: boolean
  isPro: boolean
  isTeam: boolean
  canUse: (feature: keyof typeof UPGRADE_REASONS) => boolean
  refresh: () => void
}

const Ctx = createContext<PlanContext>({
  plan: 'free',
  limits: PLAN_LIMITS.free as Limits,
  loading: true,
  isPro: false,
  isTeam: false,
  canUse: () => true,
  refresh: () => {},
})

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>('free')
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const res = await fetch('/api/billing/plan')
      const data = await res.json()
      setPlan(data.plan ?? 'free')
    } catch {
      setPlan('free')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const limits = PLAN_LIMITS[plan] as Limits

  return (
    <Ctx.Provider value={{
      plan,
      limits,
      loading,
      isPro: plan === 'pro' || plan === 'team',
      isTeam: plan === 'team',
      canUse: (f) => canUseFeature(plan, f),
      refresh: load,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const usePlan = () => useContext(Ctx)
