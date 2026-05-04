import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

function parseTime(dateStr: string, timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateStr)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { date, weekMode } = await req.json()
  const targetDate = date ? new Date(date) : new Date()
  const dateStr = targetDate.toISOString().split('T')[0]

  // For week mode, get all days in the week
  const dates: string[] = []
  if (weekMode) {
    const dayOfWeek = targetDate.getDay()
    const monday = new Date(targetDate)
    monday.setDate(targetDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }
  } else {
    dates.push(dateStr)
  }

  const weekStart = dates[0]
  const weekEnd = dates[dates.length - 1]

  // Fetch tasks
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*, project:projects(name, colour)')
    .eq('user_id', userId)
    .neq('status', 'done')
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(40)

  if (!tasks?.length) {
    return NextResponse.json({ events: [], message: 'No tasks to schedule', focusScore: 'Add some tasks first to generate a schedule.' })
  }

  const taskSummary = tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    estimatedMinutes: t.estimated_minutes ?? 30,
    deadline: t.deadline,
    project: (t as any).project?.name ?? 'General',
    colour: (t as any).project?.colour ?? '#2d7a4f',
  }))

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are a smart calendar scheduler. Create an optimal schedule for ${weekMode ? `the week of ${weekStart} to ${weekEnd}` : dateStr}.

Rules:
- Work hours: 9:00 to 18:00 each day
- Group tasks from the SAME project together on the SAME day to minimise context switching
- Urgent/deadline tasks go earlier in the week
- Add a 30-min lunch break at 12:30 each day
- Add 10-min breaks every 90 minutes
- Spread tasks across days so no day is overloaded
- If a task has no estimate, assume 30 minutes
- Only schedule Mon-Fri

Available dates: ${dates.join(', ')}

Tasks:
${JSON.stringify(taskSummary, null, 2)}

Return ONLY valid JSON:
{
  "events": [
    {
      "taskId": "uuid or null for breaks",
      "title": "Task or break title",
      "date": "2026-05-05",
      "startTime": "09:00",
      "endTime": "09:30",
      "project": "Project name or null",
      "colour": "#2d7a4f",
      "type": "task or break or lunch",
      "priority": "low|medium|high|urgent or null"
    }
  ],
  "focusScore": "One sentence tip for this schedule"
}`
    }]
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  let schedule: any
  try {
    schedule = JSON.parse(rawText.replace(/```json|```/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Failed to parse schedule' }, { status: 500 })
  }

  // Convert to calendar_events format and save
  const eventsToSave = schedule.events.map((e: any) => ({
    user_id: userId,
    task_id: e.taskId || null,
    title: e.title,
    start_time: parseTime(e.date, e.startTime),
    end_time: parseTime(e.date, e.endTime),
    colour: e.colour ?? '#2d7a4f',
    type: 'ai_generated',
    description: e.project ? `Project: ${e.project}` : null,
  }))

  // Delete old AI events for this period and save new ones
  await supabaseAdmin
    .from('calendar_events')
    .delete()
    .eq('user_id', userId)
    .eq('type', 'ai_generated')
    .gte('start_time', `${weekStart}T00:00:00Z`)
    .lte('start_time', `${weekEnd}T23:59:59Z`)

  const { data: saved } = await supabaseAdmin
    .from('calendar_events')
    .insert(eventsToSave)
    .select()

  return NextResponse.json({
    events: saved ?? [],
    focusScore: schedule.focusScore,
    weekStart,
    weekEnd,
  })
}
