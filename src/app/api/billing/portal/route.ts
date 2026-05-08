import { auth, currentUser } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get Stripe customer ID from our DB
  const { data } = await supabaseAdmin
    .from('user_plans')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  if (!data?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tasks.acreonix.co.uk'
  const session = await stripe.billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${origin}/dashboard/billing`,
  })

  return NextResponse.json({ url: session.url })
}
