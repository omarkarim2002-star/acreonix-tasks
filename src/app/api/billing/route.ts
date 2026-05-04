import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { PLAN_PRICES, Plan } from '@/lib/plans'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { action, plan } = await req.json()

  // Get or create Stripe customer
  const { data: sub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('stripe_customer_id, plan, stripe_subscription_id')
    .eq('user_id', userId)
    .single()

  let customerId = sub?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { userId },
    })
    customerId = customer.id
    await supabaseAdmin.from('user_subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      plan: 'free',
      status: 'active',
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (action === 'checkout') {
    // New subscription checkout
    const priceId = plan === 'pro' ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_TEAM_PRICE_ID
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?success=true&plan=${plan}`,
      cancel_url: `${appUrl}/dashboard/billing?cancelled=true`,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { userId, plan },
        trial_period_days: 7,
      },
      metadata: { userId, plan },
    })

    return NextResponse.json({ url: session.url })
  }

  if (action === 'portal') {
    // Customer portal for manage/cancel
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard/billing`,
    })
    return NextResponse.json({ url: portalSession.url })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
