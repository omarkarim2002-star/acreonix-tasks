import { stripe, PLAN_CREDITS } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!
  const secret    = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── Handle events ───────────────────────────────────────────────────────
  switch (event.type) {

    // Subscription created or updated (Pro / Team)
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub     = event.data.object as Stripe.Subscription
      const userId  = sub.metadata?.userId
      const tier    = sub.metadata?.tier ?? 'pro'
      const active  = sub.status === 'active' || sub.status === 'trialing'
      const plan    = active ? tier : 'free'
      const custId  = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

      if (userId) {
        await supabaseAdmin.from('user_plans').upsert({
          user_id:            userId,
          plan,
          stripe_customer_id: custId,
          stripe_sub_id:      sub.id,
          credits_used:       0,
          period_start:       new Date(((sub as any).current_period_start ?? Date.now() / 1000) * 1000).toISOString(),
          updated_at:         new Date().toISOString(),
        }, { onConflict: 'user_id' })
      }
      break
    }

    // Subscription cancelled
    case 'customer.subscription.deleted': {
      const sub    = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.userId
      if (userId) {
        await supabaseAdmin.from('user_plans')
          .update({ plan: 'free', stripe_sub_id: null, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
      }
      break
    }

    // One-time payment (top-up packs)
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'payment') break

      const userId  = session.metadata?.userId
      const tier    = session.metadata?.tier ?? ''
      const custId  = typeof session.customer === 'string' ? session.customer : session.customer?.id

      // Add credits based on pack
      const creditsToAdd = tier === 'pack_10' ? 10 : tier === 'pack_30' ? 30 : tier === 'pack_100' ? 100 : 0

      if (userId && creditsToAdd > 0) {
        // Subtract from credits_used (effectively adding to available)
        const { data } = await supabaseAdmin
          .from('user_plans').select('credits_used').eq('user_id', userId).single()

        const newUsed = Math.max(0, (data?.credits_used ?? 0) - creditsToAdd)
        await supabaseAdmin.from('user_plans').upsert({
          user_id:            userId,
          plan:               'free',
          credits_used:       newUsed,
          stripe_customer_id: custId ?? null,
          period_start:       new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
          updated_at:         new Date().toISOString(),
        }, { onConflict: 'user_id' })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
