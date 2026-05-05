import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const currentMins = now.getHours() * 60 + now.getMinutes()

  // Get user work hours preference
  const { data: prefs } = await supabaseAdmin
    .from('user_preferences')
    .select('work_start, work_end')
    .eq('user_id', userId)
    .single()

  const workStart = prefs?.work_start ?? '09:00'
  const workEnd   = prefs?.work_end   ?? '18:00'
  const startMins = toMins(workStart)
  const endMins   = toMins(workEnd)

  // Start from now if within work hours, otherwise from work start
  const scheduleFromMins = currentMins > startMins && currentMins < endMins
    ? currentMins + 5 // 5 min buffer from now
    : startMins

  const scheduleFrom = `${String(Math.floor(scheduleFromMins / 60)).padStart(2, '0')}:${String(scheduleFromMins % 60).padStart(2, '0')}`

  // Fetch today's existing calendar events (don't double-schedule)
  const { data: existing } = await supabaseAdmin
    .from('calendar_events')
    .select('start_time, end_time, title')
    .eq('user_id', userId)
    .gte('start_time', `${dateStr}T00:00:00`)
    .lte('end_time', `${dateStr}T23:59:59`)

  // Fetch pending tasks
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, priority, status, deadline, estimated_minutes, task_type, schedulable_outside_hours, project:projects(name, colour)')
    .eq('user_id', userId)
    .neq('status', 'done')
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(20)

  if (!tasks?.length) {
    return NextResponse.json({ events: [], message: "No pending tasks — you're free today." })
  }

  const taskSummary = tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    estimatedMinutes: Math.min(t.estimated_minutes ?? 30, 120),
    daysUntilDeadline: t.deadline
      ? Math.ceil((new Date(t.deadline).getTime() - now.getTime()) / 86400000)
      : null,
    project: (Array.isArray((t as any).project) ? (t as any).project[0] : (t as any).project)?.name ?? 'General',
    colour: (Array.isArray((t as any).project) ? (t as any).project[0] : (t as any).project)?.colour ?? '#2d7a4f',
    taskType: (t as any).task_type ?? 'work',
    flexible: (t as any).schedulable_outside_hours ?? false,
  }))

  const existingSummary = (existing ?? []).map(e => ({
    title: e.title,
    start: e.start_time.split('T')[1]?.slice(0, 5),
    end: e.end_time.split('T')[1]?.slice(0, 5),
  }))

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are a smart daily scheduler. Build an optimal schedule for TODAY (${dateStr}).

Schedule FROM: ${scheduleFrom} (now or work start)
Work hours: ${workStart} – ${workEnd}
Nothing before 09:00, nothing after 22:00.

Already scheduled today (avoid overlapping these):
${existingSummary.length > 0 ? JSON.stringify(existingSummary) : 'Nothing yet'}

Tasks (schedule the most important that fit):
${JSON.stringify(taskSummary, null, 2)}

Rules:
1. Urgent/deadline tasks go first
2. ONE lunch break at 13:00-13:30 if it falls within the remaining day
3. Group tasks from the same project consecutively
4. Work tasks (flexible:false) only in ${workStart}–${workEnd}
5. Flexible tasks can go in evening slots too
6. No overlaps with existing events above
7. If schedule_from is after 15:00, only schedule 2-3 tasks max
8. Each block: realistic duration, don't stretch beyond ${workEnd}

Return ONLY valid JSON:
{
  "blocks": [
    {
      "taskId": "uuid or null for breaks",
      "title": "Task title",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "colour": "#hex",
      "type": "task|lunch|break",
      "priority": "urgent|high|medium|low|null"
    }
  ],
  "summary": "One sentence — what you'll get done today"
}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  let parsed: any
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Failed to parse schedule' }, { status: 500 })
  }

  const blocks = Array.isArray(parsed.blocks) ? parsed.blocks : []
  const calEvents: any[] = []
  const seenStarts = new Set<string>()
  let hadLunch = false

  for (const block of blocks) {
    if (!block.startTime || !block.endTime) continue
    const s = toMins(block.startTime), e = toMins(block.endTime)
    if (s < 540 || e > 1320 || e <= s) continue // 09:00–22:00, end > start
    const key = `${dateStr}-${block.startTime}`
    if (seenStarts.has(key)) continue
    seenStarts.add(key)
    if (block.type === 'lunch') { if (hadLunch) continue; hadLunch = true }

    const { data: ev } = await supabaseAdmin
      .from('calendar_events')
      .insert({
        user_id:    userId,
        task_id:    block.taskId && block.taskId !== 'null' ? block.taskId : null,
        title:      block.title ?? 'Untitled',
        start_time: new Date(`${dateStr}T${block.startTime}:00`).toISOString(),
        end_time:   new Date(`${dateStr}T${block.endTime}:00`).toISOString(),
        colour:     block.colour ?? '#2d7a4f',
        type:       block.type === 'lunch' ? 'lunch' : block.type === 'break' ? 'break' : 'ai_generated',
        confirmed:  false, // provisional — user must confirm
        all_day:    false,
      })
      .select()
      .single()

    if (ev) calEvents.push(ev)
  }

  return NextResponse.json({
    events: calEvents,
    summary: parsed.summary ?? '',
    count: calEvents.filter(e => e.type === 'ai_generated').length,
  })
}
