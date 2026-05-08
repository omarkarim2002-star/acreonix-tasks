import { auth, currentUser } from '@clerk/nextjs/server'
import { stripe, PRICES } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await currentUser()
  const email = user?.emailAddresses?.[0]?.emailAddress ?? undefined

  const { tier } = await req.json()
  if (!tier) return NextResponse.json({ error: 'Missing tier' }, { status: 400 })

  const priceId = PRICES[tier as keyof typeof PRICES]
  if (!priceId) {
    return NextResponse.json(
      { error: `No price configured for tier "${tier}". Add STRIPE_PRICE_${tier.toUpperCase()} to your .env` },
      { status: 400 }
    )
  }

  const isSubscription = tier === 'pro' || tier === 'team'
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tasks.acreonix.co.uk'

  const session = await stripe.checkout.sessions.create({
    mode: isSubscription ? 'subscription' : 'payment',
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId, tier },
    success_url: `${origin}/dashboard/billing?success=1&tier=${tier}`,
    cancel_url:  `${origin}/dashboard/billing?cancelled=1`,
    ...(isSubscription ? {
      subscription_data: { metadata: { userId, tier } },
    } : {}),
  })

  return NextResponse.json({ url: session.url })
}
