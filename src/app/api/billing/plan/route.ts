import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Plans definition
const PLANS: Record<string, { credits: number; label: string }> = {
  free: { credits: 5,         label: 'Free'  },
  pro:  { credits: 9999,      label: 'Pro'   },  // unlimited shown as high number
  team: { credits: 9999,      label: 'Team'  },
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Try to get plan from user_plans table — if it doesn't exist, return free
  let plan = 'free'
  let creditsUsed = 0
  let periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  try {
    const { data } = await supabaseAdmin
      .from('user_plans')
      .select('plan, credits_used, period_start')
      .eq('user_id', userId)
      .single()

    if (data) {
      plan        = data.plan        ?? 'free'
      creditsUsed = data.credits_used ?? 0
      periodStart = data.period_start ?? periodStart
    }
  } catch {
    // Table doesn't exist yet — default to free
  }

  const planInfo     = PLANS[plan] ?? PLANS.free
  const creditsTotal = planInfo.credits
  const creditsLeft  = plan === 'free' ? Math.max(0, creditsTotal - creditsUsed) : 9999

  return NextResponse.json({
    plan,
    label:        planInfo.label,
    creditsLeft:  creditsLeft,
    creditsUsed,
    creditsTotal,
    periodStart,
    unlimited:    plan !== 'free',
  })
}
