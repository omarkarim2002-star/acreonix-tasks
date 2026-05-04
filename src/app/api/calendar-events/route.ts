import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { anthropic } from '@/lib/anthropic'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  let query = supabaseAdmin
    .from('calendar_events')
    .select('*, task:tasks(title, status, priority)')
    .eq('user_id', userId)
    .order('start_time', { ascending: true })

  if (start) query = query.gte('start_time', start)
  if (end) query = query.lte('start_time', end)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()

  // Bulk save (AI schedule)
  if (body.bulk && Array.isArray(body.events)) {
    // Delete existing AI-generated events for this date range first
    if (body.deleteFrom && body.deleteTo) {
      await supabaseAdmin
        .from('calendar_events')
        .delete()
        .eq('user_id', userId)
        .eq('type', 'ai_generated')
        .gte('start_time', body.deleteFrom)
        .lte('start_time', body.deleteTo)
    }

    const { data, error } = await supabaseAdmin
      .from('calendar_events')
      .insert(body.events.map((e: any) => ({ ...e, user_id: userId })))
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  // Single event
  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .insert({
      user_id: userId,
      task_id: body.task_id ?? null,
      title: body.title,
      description: body.description ?? null,
      start_time: body.start_time,
      end_time: body.end_time,
      colour: body.colour ?? '#2d7a4f',
      type: body.type ?? 'event',
      all_day: body.all_day ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
