import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

// Price IDs — set these after creating products in Stripe dashboard
// or set STRIPE_PRICE_PRO / STRIPE_PRICE_TEAM in your .env
export const PRICES = {
  pro:  process.env.STRIPE_PRICE_PRO  ?? '',
  team: process.env.STRIPE_PRICE_TEAM ?? '',
  // One-time top-up packs
  pack_10:  process.env.STRIPE_PRICE_PACK10  ?? '',
  pack_30:  process.env.STRIPE_PRICE_PACK30  ?? '',
  pack_100: process.env.STRIPE_PRICE_PACK100 ?? '',
}

export const PLAN_CREDITS: Record<string, number> = {
  free: 5,
  pro:  99999,
  team: 99999,
}
