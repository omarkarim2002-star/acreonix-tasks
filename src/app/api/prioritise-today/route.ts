import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Fetch pending tasks
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, priority, status, deadline, estimated_minutes, task_type, project:projects(name, colour)')
    .eq('user_id', userId)
    .neq('status', 'done')
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(20)

  if (!tasks?.length) {
    return NextResponse.json({ ranked: [], tip: 'No pending tasks — you\'re clear for today.' })
  }

  const now = new Date()
  const taskSummary = tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    daysUntilDeadline: t.deadline
      ? Math.ceil((new Date(t.deadline).getTime() - now.getTime()) / 86400000)
      : null,
    estimatedMinutes: t.estimated_minutes ?? 30,
    taskType: (t as any).task_type ?? 'work',
    project: (Array.isArray((t as any).project) ? (t as any).project[0] : (t as any).project)?.name ?? 'General',
  }))

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You are a clear-thinking productivity coach. A user needs to know what order to tackle their tasks today.

Today is ${now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}.

Tasks:
${JSON.stringify(taskSummary, null, 2)}

Rank ALL tasks from most to least important to work on TODAY. Consider:
- Deadline urgency (overdue = critical, due today/tomorrow = urgent)
- Priority label
- Task type (work tasks during work hours, personal/business can flex)
- Estimated time (fit realistic work in a day)

For each task give a SHORT reason (max 8 words) that tells the user WHY it's in that position.
Be direct. Not "This task should be prioritised because..." — just "Deadline today, client waiting" or "Low priority, no deadline pressure".

Return ONLY valid JSON, no markdown:
{
  "ranked": [
    {
      "id": "task-uuid",
      "reason": "Deadline today, client waiting"
    }
  ],
  "tip": "One sentence coaching tip for their day (max 15 words)"
}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return NextResponse.json({
      ranked: Array.isArray(result.ranked) ? result.ranked : [],
      tip: result.tip ?? '',
    })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }
}
