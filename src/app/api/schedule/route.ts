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
  const now = new Date()
  const targetDate = date ? new Date(date) : now
  const dateStr = targetDate.toISOString().split('T')[0]

  // ── Never schedule in the past ────────────────────────────────────────────
  // If today, earliest slot is current time rounded up to next 15min
  const nowStr = now.toISOString()
  const todayStr = now.toISOString().split('T')[0]
  const currentHour = now.getHours()
  const currentMin = Math.ceil(now.getMinutes() / 15) * 15
  const earliestToday = `${String(currentHour + (currentMin >= 60 ? 1 : 0)).padStart(2,'0')}:${String(currentMin >= 60 ? 0 : currentMin).padStart(2,'0')}`

  // Build the dates array — skip dates that are fully in the past
  const dates: string[] = []
  if (weekMode) {
    const dayOfWeek = targetDate.getDay()
    const monday = new Date(targetDate)
    monday.setDate(targetDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const ds = d.toISOString().split('T')[0]
      // Only include today and future dates
      if (ds >= todayStr) dates.push(ds)
    }
  } else {
    if (dateStr >= todayStr) dates.push(dateStr)
  }

  if (dates.length === 0) {
    return NextResponse.json({ events: [], message: 'All dates are in the past — nothing to schedule.', focusScore: 'Choose a current or future date to generate a schedule.' })
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

  // Fetch user work hours prefs
  const { data: prefs } = await supabaseAdmin
    .from('user_preferences')
    .select('work_start, work_end, work_days, lunch_start, lunch_end')
    .eq('user_id', userId)
    .single()

  const workStart  = prefs?.work_start  ?? '09:00'
  const workEnd    = prefs?.work_end    ?? '18:00'
  const workDays   = prefs?.work_days   ?? ['monday','tuesday','wednesday','thursday','friday']
  const lunchStart = (prefs as any)?.lunch_start ?? '12:30'
  const lunchEnd   = (prefs as any)?.lunch_end   ?? '13:00'

  // Fetch already-confirmed events in this period (imports, manual events)
  // so AI can schedule AROUND them
  const { data: existingEvents } = await supabaseAdmin
    .from('calendar_events')
    .select('title, start_time, end_time')
    .eq('user_id', userId)
    .eq('confirmed', true)
    .neq('type', 'ai_generated')
    .gte('start_time', `${weekStart}T00:00:00Z`)
    .lte('start_time', `${weekEnd}T23:59:59Z`)

  const blockedSlots = (existingEvents ?? []).map(e => ({
    title: e.title,
    start: new Date(e.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    end: new Date(e.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    date: e.start_time.split('T')[0],
  }))

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

  const isToday = dates.includes(todayStr)

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `You are a precision calendar scheduler. Create a REALISTIC, ACHIEVABLE schedule.

TODAY: ${todayStr} ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
SCHEDULING: ${weekMode ? `week of ${weekStart} to ${weekEnd}` : dateStr}

═══ HARD CONSTRAINTS (NEVER violate) ═══
1. NO events before ${nowStr} (right now)
${isToday ? `2. Today starts at ${earliestToday} — nothing before this` : '2. All days start at work start time'}
3. Work hours: ${workStart}–${workEnd} ONLY
4. Only schedule on: ${workDays.join(', ')}
5. Lunch RESERVED: ${lunchStart}–${lunchEnd} every day — skip if already past
6. Do NOT overlap these confirmed events: ${blockedSlots.length > 0 ? JSON.stringify(blockedSlots) : 'none'}

═══ SCHEDULING INTELLIGENCE ═══
- SAME PROJECT = SAME DAY: Group all tasks from the same project on the same day. Never split a project across multiple days unless it doesn't fit.
- PRIORITY ORDER: urgent → high → medium → low. Urgent tasks go on the earliest day.
- REALISTIC ESTIMATES: If no estimate given, use 45min for high/urgent, 30min for medium, 20min for low.
- CAPACITY: Max 5.5 hours of focused task time per day (rest is overhead/breaks). Do NOT overload.
- BREAKS: Add ONE 10-min break after every 90min of consecutive work. No more.
- SPREAD: If week mode, use ALL available days — don't pile everything on Monday.
- GAPS: Leave at least 5 min between consecutive tasks for context switching.
- DEADLINES FIRST: Tasks due soonest must be scheduled on the earliest possible day.

Available dates (future only): ${dates.join(', ')}

Tasks to schedule (schedule ALL of them across the week if possible):
${JSON.stringify(taskSummary, null, 2)}

Return ONLY valid JSON — no markdown, no explanation:
{
  "events": [
    {
      "taskId": "uuid — MUST match a real task id from the list above, or null for breaks/lunch",
      "title": "Exact task title from the list, or 'Lunch break' or 'Break'",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "project": "project name or null",
      "colour": "#hexcolour matching the task's project colour",
      "type": "task | break | lunch",
      "priority": "urgent | high | medium | low | null"
    }
  ],
  "focusScore": "One specific, encouraging sentence about this week's plan"
}`,
    }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  let schedule: any
  try {
    schedule = JSON.parse(rawText.replace(/```json|```/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Failed to parse schedule' }, { status: 500 })
  }

  // Extra safety: filter out any events with start_time before now
  const validEvents = (schedule.events ?? []).filter((e: any) => {
    const start = parseTime(e.date, e.startTime)
    return new Date(start) >= now
  })

  const eventsToSave = validEvents.map((e: any) => ({
    user_id: userId,
    task_id: e.taskId || null,
    title: e.title,
    start_time: parseTime(e.date, e.startTime),
    end_time: parseTime(e.date, e.endTime),
    colour: e.colour ?? '#2d7a4f',
    type: 'ai_generated',
    confirmed: false,
    description: e.project ? `Project: ${e.project}` : null,
  }))

  // Delete old AI events for this period
  await supabaseAdmin
    .from('calendar_events')
    .delete()
    .eq('user_id', userId)
    .eq('type', 'ai_generated')
    .eq('confirmed', false)
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
