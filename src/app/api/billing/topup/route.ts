import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

// Pricing tiers for extract top-ups
const TOPUP_TIERS = {
  single: { credits: 1,  price: 199,  label: '1 extract',   description: 'Single AI extract credit' },
  bundle: { credits: 10, price: 500,  label: '10 extracts', description: '10 AI extract credits — save 75%' },
} as const

type TopupTier = keyof typeof TOPUP_TIERS

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia' as any,
  })

  const { tier } = await req.json() as { tier: TopupTier }
  if (!tier || !TOPUP_TIERS[tier]) {
    return NextResponse.json({ error: 'Invalid tier. Use "single" or "bundle"' }, { status: 400 })
  }

  const { credits, price, label, description } = TOPUP_TIERS[tier]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // Get or create Stripe customer
  const { data: sub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  let customerId = sub?.stripe_customer_id

  if (!customerId) {
    const { clerkClient } = await import('@clerk/nextjs/server')
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    const email = user.emailAddresses[0]?.emailAddress

    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    })
    customerId = customer.id

    await supabaseAdmin
      .from('user_subscriptions')
      .upsert({ user_id: userId, stripe_customer_id: customerId, plan: 'free', status: 'active' })
  }

  // Create one-time checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: {
          name: `Acreonix Tasks — ${label}`,
          description,
          images: [`${appUrl}/logo.png`],
        },
        unit_amount: price,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${appUrl}/dashboard/extract?topup=success&credits=${credits}`,
    cancel_url: `${appUrl}/dashboard/billing?topup=cancelled`,
    metadata: {
      userId,
      type: 'extract_topup',
      credits: String(credits),
    },
  })

  return NextResponse.json({ url: session.url })
}
