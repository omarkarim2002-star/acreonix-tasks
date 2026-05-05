import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push'

// POST /api/push/send — send a push to yourself (testing)
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const payload = await req.json()
  const sent = await sendPushToUser(userId, payload)
  return NextResponse.json({ sent })
}
