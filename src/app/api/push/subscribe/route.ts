import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/push/subscribe — save subscription
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const subscription = await req.json()
  if (!subscription?.endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

  await supabaseAdmin
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      subscription: JSON.stringify(subscription),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  return NextResponse.json({ ok: true })
}

// DELETE /api/push/subscribe — remove subscription
export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await supabaseAdmin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)

  return NextResponse.json({ ok: true })
}
