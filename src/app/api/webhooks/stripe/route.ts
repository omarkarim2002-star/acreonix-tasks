import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

function getPlanFromPriceId(priceId: string): 'pro' | 'team' | 'free' {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_TEAM_PRICE_ID) return 'team'
  return 'free'
}

async function upsertSubscription(subscription: Stripe.Subscription, plan?: string) {
  const userId = subscription.metadata?.userId
  if (!userId) return

  const priceId = subscription.items.data[0]?.price.id
  const derivedPlan = plan ?? getPlanFromPriceId(priceId ?? '')

  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'cancelled',
    incomplete: 'incomplete',
    incomplete_expired: 'cancelled',
    unpaid: 'past_due',
    paused: 'cancelled',
  }

  await supabaseAdmin.from('user_subscriptions').upsert({
    user_id: userId,
    plan: subscription.status === 'canceled' ? 'free' : derivedPlan,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status: statusMap[subscription.status] ?? 'active',
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await upsertSubscription(sub)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (userId) {
          await supabaseAdmin.from('user_subscriptions').update({
            plan: 'free',
            status: 'cancelled',
            stripe_subscription_id: null,
            stripe_price_id: null,
          }).eq('user_id', userId)
        }
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          const plan = session.metadata?.plan
          await upsertSubscription(sub, plan)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
          await upsertSubscription(sub)
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

export const config = { api: { bodyParser: false } }
