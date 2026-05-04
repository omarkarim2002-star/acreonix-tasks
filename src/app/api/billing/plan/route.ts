import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getUserPlan, getMonthlyUsage } from '@/lib/gating'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ plan: 'free' })

  const plan = await getUserPlan(userId)
  const aiExtractsUsed = await getMonthlyUsage(userId, 'ai_extracts')

  const { data: sub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('status, current_period_end, cancel_at_period_end, trial_end')
    .eq('user_id', userId)
    .single()

  return NextResponse.json({
    plan,
    status: sub?.status ?? 'active',
    currentPeriodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
    trialEnd: sub?.trial_end ?? null,
    usage: { aiExtractsUsed },
  })
}
