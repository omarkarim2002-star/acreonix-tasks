'use client'

import { useState, useEffect } from 'react'

export type PlanData = {
  plan: string
  label: string
  creditsLeft: number
  creditsUsed: number
  creditsTotal: number
  periodStart: string
  unlimited: boolean
}

const DEFAULT: PlanData = {
  plan: 'free', label: 'Free',
  creditsLeft: 5, creditsUsed: 0, creditsTotal: 5,
  periodStart: new Date().toISOString(), unlimited: false,
}

export function usePlan() {
  const [data, setData]       = useState<PlanData>(DEFAULT)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/billing/plan')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { ...data, loading }
}
