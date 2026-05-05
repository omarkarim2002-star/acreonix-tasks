import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}
function blockValid(start: string, end: string, min: number, max: number): boolean {
  const s = toMins(start), e = toMins(end)
  return s >= min && e <= max && e > s
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rl = await checkRateLimit(userId, 'schedule')
  if (!rl.allowed) return rateLimitResponse(rl)

  const { date, weekMode, preserveExisting, workStart, workEnd } = await req.json()

  // Load user preferences (from request or DB)
  let prefStart = workStart ?? '09:00'
  let prefEnd   = workEnd   ?? '18:00'

  if (!workStart) {
    const { data: prefs } = await supabaseAdmin
      .from('user_preferences').select('work_start, work_end').eq('user_id', userId).single()
    if (prefs) { prefStart = prefs.work_start; prefEnd = prefs.work_end }
  }

  const workStartMins = toMins(prefStart)
  const workEndMins   = toMins(prefEnd)

  // Evening slot: after work until 22:00
  const eveningStart = prefEnd
  const eveningEnd   = '22:00'

  const targetDate = date ? new Date(date) : new Date()
  const dateStr = targetDate.toISOString().split('T')[0]

  const days: string[] = []
  if (weekMode) {
    const d = new Date(targetDate)
    const monday = new Date(d)
    monday.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1))
    for (let i = 0; i < 5; i++) {
      const dd = new Date(monday)
      dd.setDate(monday.getDate() + i)
      days.push(dd.toISOString().split('T')[0])
    }
    // Also include weekend for personal tasks
    for (let i = 5; i < 7; i++) {
      const dd = new Date(monday)
      dd.setDate(monday.getDate() + i)
      days.push(dd.toISOString().split('T')[0])
    }
  } else {
    days.push(dateStr)
  }

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, priority, status, estimated_minutes, deadline, task_type, schedulable_outside_hours, project:projects(name, colour)')
    .eq('user_id', userId)
    .neq('status', 'done')
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(40)

  if (!tasks?.length) {
    return NextResponse.json({ events: [], focusScore: 'No pending tasks to schedule.' })
  }

  const taskSummary = tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    estimatedMinutes: Math.min(t.estimated_minutes ?? 30, 120),
    deadline: t.deadline ? t.deadline.split('T')[0] : null,
    project: (t as any).project?.name ?? 'General',
    colour: (t as any).project?.colour ?? '#2d7a4f',
    taskType: (t as any).task_type ?? 'work',
    outsideHours: (t as any).schedulable_outside_hours ?? false,
  }))

  const workTasks     = taskSummary.filter(t => !t.outsideHours)
  const flexibleTasks = taskSummary.filter(t => t.outsideHours)

  const daysStr = days.length > 1 ? `Mon ${days[0]} to Sun ${days[6]}` : dateStr

  const prompt = `You are a smart personal scheduler. Schedule these tasks for ${daysStr}.

USER'S WORK HOURS: ${prefStart} to ${prefEnd} (weekdays only)
EVENING HOURS: ${eveningStart} to ${eveningEnd} (any day)
WEEKEND: 09:00 to ${eveningEnd}

SCHEDULING RULES — follow exactly:
1. WORK TASKS (outsideHours: false): Schedule ONLY within ${prefStart}–${prefEnd} on weekdays.
2. FLEXIBLE TASKS (outsideHours: true): Schedule in evenings (${eveningStart}–${eveningEnd}) or weekends. These are personal/business tasks that can flex.
3. No overlaps within any single day. Blocks must be perfectly sequential.
4. ONE lunch break per weekday at 13:00–13:30 (type: "lunch").
5. Group same-project tasks consecutively.
6. Urgent/deadline tasks go earlier in the week.
7. All times HH:MM 24h. A 45-min task at 14:00 ends at 14:45.
8. Nothing before 09:00 or after 22:00 ever.
9. If tasks don't fit Mon–Fri work hours, use evenings or weekend for flexible tasks.

WORK TASKS (schedule in ${prefStart}–${prefEnd} weekdays only):
${JSON.stringify(workTasks, null, 2)}

FLEXIBLE TASKS (evenings/weekends OK):
${JSON.stringify(flexibleTasks, null, 2)}

Return ONLY this JSON, no markdown:
{
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "blocks": [
        {
          "taskId": "exact-uuid-or-null",
          "title": "Task title",
          "startTime": "09:00",
          "endTime": "10:00",
          "project": "Project name or null",
          "colour": "#hex",
          "type": "task|lunch|break",
          "taskType": "work|business|personal",
          "priority": "urgent|high|medium|low|null"
        }
      ]
    }
  ],
  "focusTip": "One sentence personalised tip."
}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  let parsed: any
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI schedule — please try again' }, { status: 500 })
  }

  const scheduleArr = parsed.schedule ?? [{ date: dateStr, blocks: parsed.blocks ?? [] }]
  const calEvents: any[] = []

  for (const daySchedule of scheduleArr) {
    const dayDate = daySchedule.date ?? dateStr
    const dayOfWeek = new Date(dayDate).getDay() // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    const blocks = Array.isArray(daySchedule.blocks) ? daySchedule.blocks : []
    let hadLunch = false
    const seenStarts = new Set<string>()

    for (const block of blocks) {
      if (!block.startTime || !block.endTime) continue

      // For weekday work blocks: enforce work hours
      // For flexible/personal: allow evening range
      const isFlexible = block.taskType === 'personal' || block.taskType === 'business'
      const isBreak = block.type === 'lunch' || block.type === 'break'

      let valid = false
      if (isWeekend) {
        valid = blockValid(block.startTime, block.endTime, 540, 1320) // 09:00–22:00
      } else if (isFlexible && !isBreak) {
        // Flexible on weekday: work hours OR evening
        valid = blockValid(block.startTime, block.endTime, workStartMins, workEndMins) ||
                blockValid(block.startTime, block.endTime, toMins(eveningStart), 1320)
      } else {
        valid = blockValid(block.startTime, block.endTime, workStartMins, workEndMins)
      }

      if (!valid) continue

      const key = `${dayDate}-${block.startTime}`
      if (seenStarts.has(key)) continue
      seenStarts.add(key)

      if (block.type === 'lunch') { if (hadLunch || isWeekend) continue; hadLunch = true }

      const taskTypeColour: Record<string, string> = {
        personal: '#8b5cf6',
        business: '#c9a84c',
        work: block.colour ?? '#2d7a4f',
      }

      const { data: ev } = await supabaseAdmin
        .from('calendar_events')
        .insert({
          user_id:    userId,
          task_id:    block.taskId && block.taskId !== 'null' ? block.taskId : null,
          title:      block.title ?? 'Untitled',
          start_time: new Date(`${dayDate}T${block.startTime}:00`).toISOString(),
          end_time:   new Date(`${dayDate}T${block.endTime}:00`).toISOString(),
          colour:     isBreak ? '#9ca3af' : (taskTypeColour[block.taskType ?? 'work'] ?? block.colour ?? '#2d7a4f'),
          type:       block.type === 'lunch' ? 'lunch' : block.type === 'break' ? 'break' : 'ai_generated',
          all_day:    false,
        })
        .select()
        .single()

      if (ev) calEvents.push(ev)
    }
  }

  return NextResponse.json({
    events: calEvents,
    focusScore: parsed.focusTip ?? parsed.focusScore ?? '',
  })
}
