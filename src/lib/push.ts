import { supabaseAdmin } from './supabase'

type PushPayload = {
  title: string
  body: string
  url?: string
  tag?: string
  requireInteraction?: boolean
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<boolean> {
  const { data: sub } = await supabaseAdmin
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId)
    .single()

  if (!sub?.subscription) return false

  const webpush = await import('web-push')
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? 'noreply@acreonix.co.uk'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  try {
    await webpush.sendNotification(
      JSON.parse(sub.subscription),
      JSON.stringify(payload)
    )
    return true
  } catch (e: any) {
    if (e.statusCode === 410) {
      await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId)
    }
    return false
  }
}
