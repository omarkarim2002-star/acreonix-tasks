import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { date } = await req.json()
  const targetDate = date ? new Date(date) : new Date()
  const dateStr = targetDate.toISOString().split('T')[0]

  // Fetch incomplete tasks with deadlines or high priority
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('*, project:projects(name, colour)')
    .eq('user_id', userId)
    .neq('status', 'done')
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(30)

  if (!tasks?.length) {
    return NextResponse.json({ blocks: [], message: 'No tasks to schedule' })
  }

  const taskSummary = tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    estimatedMinutes: t.estimated_minutes ?? 30,
    deadline: t.deadline,
    project: (t as any).project?.name ?? 'No project',
  }))

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are a smart daily scheduler. Create an optimal schedule for ${dateStr} based on these tasks.

Rules:
- Work day is 9:00 AM to 6:00 PM
- Group tasks from the same project together to minimise context switching
- Put urgent/deadline tasks earlier
- Add a 5-minute context switch buffer between different projects
- Add a lunch break at 12:30 (30 min)
- Add short breaks every 90 minutes (10 min)
- If a task has no estimate, assume 30 minutes
- Never schedule more than what fits in the day

Tasks:
${JSON.stringify(taskSummary, null, 2)}

Return ONLY valid JSON, no markdown:
{
  "blocks": [
    {
      "taskId": "uuid or null for breaks",
      "title": "Task title or 'Lunch break' or 'Short break'",
      "startTime": "09:00",
      "endTime": "09:30",
      "project": "Project name or null",
      "colour": "#2d7a4f or null",
      "type": "task|break|lunch",
      "priority": "low|medium|high|urgent or null"
    }
  ],
  "totalTaskMinutes": 240,
  "focusScore": "A brief one-sentence tip for this schedule"
}`
    }]
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const schedule = JSON.parse(rawText.replace(/```json|```/g, '').trim())
    return NextResponse.json(schedule)
  } catch {
    return NextResponse.json({ error: 'Failed to parse schedule' }, { status: 500 })
  }
}
