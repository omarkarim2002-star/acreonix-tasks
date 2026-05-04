import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const [{ data: tasks }, { data: timeLogs }] = await Promise.all([
    supabaseAdmin
      .from('tasks')
      .select('*, project:projects(name, colour)')
      .eq('user_id', userId)
      .neq('status', 'done')
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(20),
    supabaseAdmin
      .from('time_logs')
      .select('task_id, started_at, ended_at, duration_minutes')
      .eq('user_id', userId)
      .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  ])

  const now = new Date().toISOString()

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You are a productivity coach. Based on the tasks and recent time logs below, tell the user exactly what to work on RIGHT NOW and what can wait.

Current time: ${now}

Tasks:
${JSON.stringify(tasks?.map(t => ({
  id: t.id,
  title: t.title,
  priority: t.priority,
  status: t.status,
  deadline: t.deadline,
  estimated_minutes: t.estimated_minutes,
  project: (t as any).project?.name,
})), null, 2)}

Recent time logs (last 7 days):
${JSON.stringify(timeLogs, null, 2)}

Return ONLY valid JSON, no markdown:
{
  "doNow": [
    {
      "taskId": "uuid",
      "title": "task title",
      "reason": "one sentence why this is urgent",
      "estimatedMinutes": 30
    }
  ],
  "doLater": [
    {
      "taskId": "uuid", 
      "title": "task title",
      "reason": "one sentence why this can wait"
    }
  ],
  "insight": "One powerful personalised observation about their work patterns based on the time logs",
  "focusTip": "One actionable tip for today"
}`
    }]
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
  try {
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Failed to parse prioritisation' }, { status: 500 })
  }
}
