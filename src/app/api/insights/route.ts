import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rl = await checkRateLimit(userId, 'insights')
  if (!rl.allowed) return rateLimitResponse(rl)

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') ?? 'week' // 'day' or 'week'

  const days = period === 'day' ? 1 : 7
  const since = new Date()
  since.setDate(since.getDate() - days)

  const [
    { data: tasks },
    { data: timeLogs },
    { data: projects },
    { data: completedTasks },
  ] = await Promise.all([
    supabaseAdmin.from('tasks').select('*, project:projects(name,colour)').eq('user_id', userId).neq('status', 'done').order('deadline', { ascending: true, nullsFirst: false }),
    supabaseAdmin.from('time_logs').select('*, task:tasks(title, project:projects(name,colour))').eq('user_id', userId).gte('started_at', since.toISOString()).order('started_at', { ascending: false }),
    supabaseAdmin.from('projects').select('*, tasks(id,status)').eq('user_id', userId).eq('status', 'active'),
    supabaseAdmin.from('tasks').select('*, project:projects(name,colour)').eq('user_id', userId).eq('status', 'done').gte('updated_at', since.toISOString()),
  ])

  // Compute time by project
  const timeByProject: Record<string, number> = {}
  for (const log of timeLogs ?? []) {
    const projectName = (log as any).task?.project?.name ?? 'No project'
    timeByProject[projectName] = (timeByProject[projectName] ?? 0) + (log.duration_minutes ?? 0)
  }

  const totalMinutes = Object.values(timeByProject).reduce((a, b) => a + b, 0)

  // Overdue tasks
  const now = new Date()
  const overdue = (tasks ?? []).filter(t => t.deadline && new Date(t.deadline) < now)

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are a productivity coach analysing someone's ${period === 'day' ? 'day' : 'week'}.

Period: Last ${days} day(s)
Total tracked time: ${totalMinutes} minutes
Time by project: ${JSON.stringify(timeByProject)}
Tasks completed: ${completedTasks?.length ?? 0}
Tasks overdue: ${overdue.length}
Pending tasks: ${tasks?.length ?? 0}
Active projects: ${projects?.length ?? 0}

Completed tasks:
${JSON.stringify(completedTasks?.slice(0, 10)?.map(t => ({ title: t.title, project: (t as any).project?.name })))}

Pending tasks (top 10):
${JSON.stringify(tasks?.slice(0, 10)?.map(t => ({ title: t.title, priority: t.priority, deadline: t.deadline, project: (t as any).project?.name })))}

Time logs summary:
${JSON.stringify(timeLogs?.slice(0, 15)?.map(l => ({ task: (l as any).task?.title, project: (l as any).task?.project?.name, minutes: l.duration_minutes, started: l.started_at })))}

Return ONLY valid JSON, no markdown:
{
  "headline": "One punchy sentence summarising the ${period === 'day' ? 'day' : 'week'}",
  "score": 72,
  "scoreLabel": "Good focus",
  "completedCount": ${completedTasks?.length ?? 0},
  "totalMinutes": ${totalMinutes},
  "topProject": "Project name that got most time",
  "insights": [
    {
      "type": "success|warning|tip|pattern",
      "title": "Short insight title",
      "detail": "2-3 sentence explanation with specific data"
    }
  ],
  "tips": [
    "Actionable tip 1 specific to their data",
    "Actionable tip 2",
    "Actionable tip 3"
  ],
  "tomorrowFocus": "One clear recommendation for what to prioritise next",
  "timeBreakdown": ${JSON.stringify(Object.entries(timeByProject).map(([name, mins]) => ({ name, minutes: mins, pct: totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0 })))}
}`
    }]
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim())
    return NextResponse.json({ ...result, period, generatedAt: new Date().toISOString() })
  } catch {
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
