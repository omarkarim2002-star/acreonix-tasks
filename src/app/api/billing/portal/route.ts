// @ts-nocheck
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data } = await supabaseAdmin
    .from('user_plans')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  const row = data as any
  if (!row?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const { stripe } = await import('@/lib/stripe')
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tasks.acreonix.co.uk'
  const session = await stripe.billingPortal.sessions.create({
    customer:   row.stripe_customer_id,
    return_url: `${origin}/dashboard/billing`,
  })

  return NextResponse.json({ url: session.url })
}
