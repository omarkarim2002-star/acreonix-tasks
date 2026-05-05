import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUserPlan } from '@/lib/gating'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const plan = await getUserPlan(userId)

  const { data: sub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('plan, status, stripe_customer_id, stripe_subscription_id, current_period_end')
    .eq('user_id', userId)
    .single()

  // Get this month's extract usage + period start (28-day rolling window)
  const now = new Date()
  const periodStart = new Date(now)
  periodStart.setDate(1)
  periodStart.setHours(0, 0, 0, 0)
  const periodStartStr = periodStart.toISOString().split('T')[0]

  const { data: usageRow } = await supabaseAdmin
    .from('usage_tracking')
    .select('count, period_start')
    .eq('user_id', userId)
    .eq('metric', 'ai_extracts')
    .eq('period_start', periodStartStr)
    .single()

  // Get top-up credits for free users
  let topUpCredits = 0
  if (plan === 'free') {
    const { data: credits } = await supabaseAdmin
      .from('extract_credits')
      .select('credits_remaining')
      .eq('user_id', userId)
      .single()
    topUpCredits = credits?.credits_remaining ?? 0
  }

  // Get Stripe subscription details for countdown
  let trialEnd = null
  let cancelAtPeriodEnd = false
  if (sub?.stripe_subscription_id) {
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' as any })
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
      trialEnd = stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null
      cancelAtPeriodEnd = stripeSub.cancel_at_period_end
    } catch {}
  }

  return NextResponse.json({
    plan,
    status: sub?.status ?? 'active',
    currentPeriodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd,
    trialEnd,
    topUpCredits,
    usage: {
      aiExtractsUsed: usageRow?.count ?? 0,
      periodStart: usageRow?.period_start ?? periodStartStr,
    },
  })
}
