import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { date, weekMode } = await req.json()
  const targetDate = date ? new Date(date) : new Date()
  const dateStr = targetDate.toISOString().split('T')[0]

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, priority, status, estimated_minutes, deadline, project:projects(name, colour)')
    .eq('user_id', userId)
    .neq('status', 'done')
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(30)

  if (!tasks?.length) {
    return NextResponse.json({ events: [], focusScore: 'No pending tasks to schedule.' })
  }

  const taskSummary = tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    estimatedMinutes: t.estimated_minutes ?? 30,
    deadline: t.deadline,
    project: (t as any).project?.name ?? 'General',
    colour: (t as any).project?.colour ?? '#2d7a4f',
  }))

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are a smart daily scheduler. Create an optimal schedule for ${dateStr}.

Rules:
- Work day: 9:00 AM to 6:00 PM
- Group tasks from the SAME project together to protect focus
- Urgent/deadline tasks go earlier
- Add lunch break at 12:30 (30 min)
- Add a 10-min break every 90 mins of work
- If no estimate, assume 30 minutes
- Never exceed the day

Tasks:
${JSON.stringify(taskSummary, null, 2)}

Return ONLY valid JSON, no markdown:
{
  "blocks": [
    {
      "taskId": "uuid or null for breaks",
      "title": "Task title",
      "startTime": "09:00",
      "endTime": "09:30",
      "project": "Project name or null",
      "colour": "#2d7a4f or null",
      "type": "task|break|lunch",
      "priority": "low|medium|high|urgent or null"
    }
  ],
  "focusScore": "One-sentence tip for this schedule"
}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  let schedule: any
  try {
    schedule = JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI schedule — please try again' }, { status: 500 })
  }

  const blocks = Array.isArray(schedule.blocks) ? schedule.blocks : []

  // Convert blocks → calendar_events shape and save to DB
  const calEvents = []
  for (const block of blocks) {
    if (!block.startTime || !block.endTime) continue

    const startISO = new Date(`${dateStr}T${block.startTime}:00`).toISOString()
    const endISO   = new Date(`${dateStr}T${block.endTime}:00`).toISOString()

    const { data: ev } = await supabaseAdmin
      .from('calendar_events')
      .insert({
        user_id:    userId,
        task_id:    block.taskId ?? null,
        title:      block.title ?? 'Untitled',
        start_time: startISO,
        end_time:   endISO,
        colour:     block.colour ?? (block.type === 'break' || block.type === 'lunch' ? '#9ca3af' : '#2d7a4f'),
        type:       block.type === 'break' ? 'break' : block.type === 'lunch' ? 'lunch' : 'ai_generated',
        all_day:    false,
      })
      .select()
      .single()

    if (ev) calEvents.push(ev)
  }

  return NextResponse.json({
    events: calEvents,
    focusScore: schedule.focusScore ?? '',
  })
}
