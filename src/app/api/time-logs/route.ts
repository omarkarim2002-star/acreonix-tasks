import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { anthropic } from '@/lib/anthropic'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('task_id')
  const days = parseInt(searchParams.get('days') ?? '7')

  const since = new Date()
  since.setDate(since.getDate() - days)

  let query = supabaseAdmin
    .from('time_logs')
    .select('*, task:tasks(title, project:projects(name, colour))')
    .eq('user_id', userId)
    .gte('started_at', since.toISOString())
    .order('started_at', { ascending: false })

  if (taskId) query = query.eq('task_id', taskId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()

  // Natural language parsing via AI
  if (body.natural) {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Parse this time log entry and return ONLY valid JSON, no markdown.
Today is ${new Date().toISOString()}.

Entry: "${body.natural}"

Return:
{
  "started_at": "ISO datetime",
  "ended_at": "ISO datetime or null if still ongoing",
  "note": "any extra note extracted or null"
}`
      }]
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
      body.started_at = parsed.started_at
      body.ended_at = parsed.ended_at
      body.note = parsed.note
    } catch {
      return NextResponse.json({ error: 'Could not parse time entry' }, { status: 400 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('time_logs')
    .insert({
      user_id: userId,
      task_id: body.task_id ?? null,
      started_at: body.started_at,
      ended_at: body.ended_at ?? null,
      note: body.note ?? null,
    })
    .select('*, task:tasks(title)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
