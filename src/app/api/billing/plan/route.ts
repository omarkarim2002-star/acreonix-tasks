// @ts-nocheck
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const PLANS: Record<string, { credits: number; label: string }> = {
  free: { credits: 5,     label: 'Free' },
  pro:  { credits: 99999, label: 'Pro'  },
  team: { credits: 99999, label: 'Team' },
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let plan        = 'free'
  let creditsUsed = 0
  let periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  // Lazy import — only runs at request time, not build time
  try {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { data } = await supabaseAdmin
      .from('user_plans')
      .select('plan, credits_used, period_start')
      .eq('user_id', userId)
      .single()

    if (data) {
      const row = data as any
      plan        = row.plan         ?? 'free'
      creditsUsed = row.credits_used ?? 0
      periodStart = row.period_start ?? periodStart
    }
  } catch {
    // Table doesn't exist yet or env vars missing — return free defaults
  }

  const planInfo    = PLANS[plan] ?? PLANS.free
  const creditsLeft = plan === 'free'
    ? Math.max(0, planInfo.credits - creditsUsed)
    : 99999

  return NextResponse.json({
    plan,
    label:        planInfo.label,
    creditsLeft,
    creditsUsed,
    creditsTotal: planInfo.credits,
    periodStart,
    unlimited:    plan !== 'free',
  })
}
