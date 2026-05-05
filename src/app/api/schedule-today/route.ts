import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

function toMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function roundUpTo15(mins: number): number {
  return Math.ceil(mins / 15) * 15
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const nowMins = now.getHours() * 60 + now.getMinutes()

  // Get user work hours
  const { data: prefs } = await supabaseAdmin
    .from('user_preferences')
    .select('work_start, work_end, lunch_start, lunch_end')
    .eq('user_id', userId)
    .single()

  const workStart  = prefs?.work_start  ?? '09:00'
  const workEnd    = prefs?.work_end    ?? '18:00'
  const lunchStart = (prefs as any)?.lunch_start ?? '12:30'
  const lunchEnd   = (prefs as any)?.lunch_end   ?? '13:00'
  const startMins = toMins(workStart)
  const endMins   = toMins(workEnd)

  // ── Never schedule before NOW ─────────────────────────────────────────────
  // Round current time up to next 15-minute slot with a 5-min buffer
  const earliestMins = roundUpTo15(nowMins + 5)
  const scheduleFromMins = Math.max(earliestMins, startMins)

  // If we're already past work end, nothing to schedule today
  if (scheduleFromMins >= endMins) {
    return NextResponse.json({
      events: [],
      summary: `Work hours are over for today (${workEnd}). Tomorrow's schedule will start fresh.`,
      count: 0,
    })
  }

  const scheduleFrom = `${String(Math.floor(scheduleFromMins / 60)).padStart(2, '0')}:${String(scheduleFromMins % 60).padStart(2, '0')}`

  // Current time string for prompt
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  // Fetch confirmed existing events today (schedule around them)
  const { data: existing } = await supabaseAdmin
    .from('calendar_events')
    .select('start_time, end_time, title')
    .eq('user_id', userId)
    .eq('confirmed', true)
    .gte('start_time', `${dateStr}T00:00:00`)
    .lte('end_time', `${dateStr}T23:59:59`)

  // Also delete stale unconfirmed AI events from today (re-planning)
  await supabaseAdmin
    .from('calendar_events')
    .delete()
    .eq('user_id', userId)
    .eq('type', 'ai_generated')
    .eq('confirmed', false)
    .gte('start_time', `${dateStr}T00:00:00`)
    .lte('start_time', `${dateStr}T23:59:59`)

  // Fetch pending tasks
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, priority, status, deadline, estimated_minutes, project:projects(name, colour)')
    .eq('user_id', userId)
    .neq('status', 'done')
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(20)

  if (!tasks?.length) {
    return NextResponse.json({ events: [], summary: "No pending tasks — you're free today.", count: 0 })
  }

  const taskSummary = tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    estimatedMinutes: Math.min((t as any).estimated_minutes ?? 30, 120),
    daysUntilDeadline: t.deadline
      ? Math.ceil((new Date(t.deadline).getTime() - now.getTime()) / 86400000)
      : null,
    project: (Array.isArray((t as any).project) ? (t as any).project[0] : (t as any).project)?.name ?? 'General',
    colour: (Array.isArray((t as any).project) ? (t as any).project[0] : (t as any).project)?.colour ?? '#2d7a4f',
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
      content: `You are a precision daily scheduler. Build today's plan.

TODAY: ${dateStr} — CURRENT TIME: ${nowTimeStr}
EARLIEST SLOT: ${scheduleFrom} (round up from now + buffer)
WORK HOURS: ${workStart}–${workEnd}
LUNCH: ${lunchStart}–${lunchEnd} (skip if already past ${nowTimeStr})

═══ HARD RULES ═══
- NOTHING before ${scheduleFrom} — absolutely zero events in the past
- Stay within ${workStart}–${workEnd}
- Do NOT overlap confirmed events: ${JSON.stringify(existingSummary)}
- Lunch at ${lunchStart}–${lunchEnd} only if not yet passed

═══ SMART SCHEDULING ═══
- Group tasks from the SAME project back-to-back — no context switching
- Urgent/overdue tasks go FIRST
- Add one 10-min break per 90min of work — no more
- If only 2-3 hours left, pick 2-3 most important tasks max
- Realistic estimates: urgent=45min, high=40min, medium=30min, low=20min if not specified
- Leave 5min gap between tasks

Tasks:
${JSON.stringify(taskSummary, null, 2)}

Return ONLY valid JSON:
{
  "blocks": [
    {
      "taskId": "uuid matching task id above, or null for breaks",
      "title": "Task title or 'Lunch break' or 'Break'",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "colour": "#hex",
      "type": "task|lunch|break",
      "priority": "urgent|high|medium|low|null"
    }
  ],
  "summary": "One specific sentence about what you'll accomplish today"
}`
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
    const s = toMins(block.startTime)
    const e = toMins(block.endTime)

    // ── Hard filter: never save anything before current time ─────────────
    if (s < scheduleFromMins) continue
    if (s >= endMins || e > endMins + 60) continue // past work end (+1h tolerance)
    if (e <= s) continue

    const key = `${dateStr}-${block.startTime}`
    if (seenStarts.has(key)) continue
    seenStarts.add(key)

    if (block.type === 'lunch') {
      if (hadLunch) continue
      hadLunch = true
    }

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
        confirmed:  false,
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
