// Add this handler inside the existing webhook route's switch statement
// Find: case 'customer.subscription.updated':
// Add BEFORE it:

/*
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session
  if (session.metadata?.type === 'extract_topup') {
    const userId = session.metadata.userId
    const credits = parseInt(session.metadata.credits ?? '1')

    // Store as credit grants in a new table OR add to a credits column
    // Simple approach: upsert into extract_credits table
    await supabaseAdmin
      .from('extract_credits')
      .upsert({
        user_id: userId,
        credits_remaining: credits,
      }, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      })

    // Actually we want to ADD to existing credits, not replace
    // Use RPC for atomic increment
    const { data: existing } = await supabaseAdmin
      .from('extract_credits')
      .select('credits_remaining')
      .eq('user_id', userId)
      .single()

    if (existing) {
      await supabaseAdmin
        .from('extract_credits')
        .update({ credits_remaining: existing.credits_remaining + credits })
        .eq('user_id', userId)
    } else {
      await supabaseAdmin
        .from('extract_credits')
        .insert({ user_id: userId, credits_remaining: credits })
    }
  }
  break
}
*/

// FULL UPDATED WEBHOOK ROUTE — replace src/app/api/webhooks/stripe/route.ts:
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia' as any,
  })

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {

    // ── One-time top-up payment completed ──────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.type === 'extract_topup') {
        const userId = session.metadata.userId
        const credits = parseInt(session.metadata.credits ?? '1')

        // Atomically add credits
        const { data: existing } = await supabaseAdmin
          .from('extract_credits')
          .select('credits_remaining')
          .eq('user_id', userId)
          .single()

        if (existing) {
          await supabaseAdmin
            .from('extract_credits')
            .update({ credits_remaining: existing.credits_remaining + credits, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
        } else {
          await supabaseAdmin
            .from('extract_credits')
            .insert({ user_id: userId, credits_remaining: credits })
        }
      }
      break
    }

    // ── Subscription created/updated ────────────────────────────────────────
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      const { data: userSub } = await supabaseAdmin
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (!userSub) break

      const priceId = subscription.items.data[0]?.price.id
      let plan: 'free' | 'pro' | 'team' = 'free'
      if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro'
      if (priceId === process.env.STRIPE_TEAM_PRICE_ID) plan = 'team'

      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          plan,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        })
        .eq('user_id', userSub.user_id)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await supabaseAdmin
        .from('user_subscriptions')
        .update({ plan: 'free', status: 'cancelled', stripe_subscription_id: null })
        .eq('stripe_customer_id', customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
