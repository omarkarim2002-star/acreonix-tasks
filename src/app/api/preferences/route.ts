import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single()

  // Return defaults if not set
  return NextResponse.json(data ?? {
    work_start: '09:00',
    work_end: '18:00',
    work_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    timezone: 'Europe/London',
  })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { work_start, work_end, work_days, timezone } = body

  const { data, error } = await supabaseAdmin
    .from('user_preferences')
    .upsert({
      user_id: userId,
      work_start: work_start ?? '09:00',
      work_end: work_end ?? '18:00',
      work_days: work_days ?? ['mon', 'tue', 'wed', 'thu', 'fri'],
      timezone: timezone ?? 'Europe/London',
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
