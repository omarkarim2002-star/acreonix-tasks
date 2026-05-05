import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rl = await checkRateLimit(userId, 'behaviour-insights')
  if (!rl.allowed) return rateLimitResponse(rl)

  const now = new Date()
  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  // Fetch 4 weeks of data in parallel
  const [logsRes, completedRes, pendingRes] = await Promise.all([
    supabaseAdmin
      .from('time_logs')
      .select('id, started_at, ended_at, duration_minutes, task:tasks(title, priority, estimated_minutes, project:projects(name, colour))')
      .eq('user_id', userId)
      .gte('started_at', fourWeeksAgo.toISOString())
      .order('started_at', { ascending: true }),
    supabaseAdmin
      .from('tasks')
      .select('id, title, priority, estimated_minutes, completed_at, created_at, project:projects(name)')
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('completed_at', fourWeeksAgo.toISOString()),
    supabaseAdmin
      .from('tasks')
      .select('id, title, priority, deadline, updated_at, project:projects(name)')
      .eq('user_id', userId)
      .neq('status', 'done'),
  ])

  const logs = logsRes.data ?? []
  const completed = completedRes.data ?? []
  const pending = pendingRes.data ?? []

  if (logs.length < 3 && completed.length < 3) {
    return NextResponse.json({
      hasEnoughData: false,
      message: "Keep using the app for a few more days — I'll start spotting patterns once there's more data to work with.",
    })
  }

  // ── Compute raw patterns ─────────────────────────────────────────────────

  // 1. Time by day of week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const timeByDay: Record<string, number> = {}
  const tasksByDay: Record<string, number> = {}
  for (const log of logs) {
    const day = dayNames[new Date(log.started_at).getDay()]
    timeByDay[day] = (timeByDay[day] ?? 0) + (log.duration_minutes ?? 0)
  }
  for (const task of completed) {
    if (!task.completed_at) continue
    const day = dayNames[new Date(task.completed_at).getDay()]
    tasksByDay[day] = (tasksByDay[day] ?? 0) + 1
  }

  // 2. Time by hour of day (productivity windows)
  const timeByHour: Record<number, number> = {}
  for (const log of logs) {
    const hour = new Date(log.started_at).getHours()
    timeByHour[hour] = (timeByHour[hour] ?? 0) + (log.duration_minutes ?? 0)
  }
  const peakHour = Object.entries(timeByHour).sort((a, b) => b[1] - a[1])[0]?.[0]

  // 3. Estimation accuracy — compare estimated vs actual for tasks with both
  const estimationData: { title: string; estimated: number; actual: number; ratio: number }[] = []
  for (const log of logs) {
    const task = (log as any).task
    if (!task?.estimated_minutes || !log.duration_minutes) continue
    estimationData.push({
      title: task.title,
      estimated: task.estimated_minutes,
      actual: log.duration_minutes,
      ratio: log.duration_minutes / task.estimated_minutes,
    })
  }
  const avgEstimationRatio = estimationData.length > 0
    ? estimationData.reduce((s, d) => s + d.ratio, 0) / estimationData.length
    : null

  // 4. Project focus distribution
  const timeByProject: Record<string, number> = {}
  for (const log of logs) {
    const project = (log as any).task?.project?.name ?? 'No project'
    timeByProject[project] = (timeByProject[project] ?? 0) + (log.duration_minutes ?? 0)
  }
  const totalTime = Object.values(timeByProject).reduce((a, b) => a + b, 0)

  // 5. Most productive day
  const mostProductiveDay = Object.entries(tasksByDay).sort((a, b) => b[1] - a[1])[0]?.[0]
  const leastProductiveDay = Object.entries(tasksByDay).sort((a, b) => a[1] - b[1])[0]?.[0]

  // 6. Overdue rate
  const overdueCount = pending.filter(t => t.deadline && new Date(t.deadline) < now).length
  const overdueRate = pending.length > 0 ? overdueCount / pending.length : 0

  // 7. Weekly completion trend (are things getting better or worse?)
  const weeklyCompletions: Record<string, number> = {}
  for (const task of completed) {
    if (!task.completed_at) continue
    const week = Math.floor((now.getTime() - new Date(task.completed_at).getTime()) / (7 * 86400000))
    const weekLabel = week === 0 ? 'This week' : week === 1 ? 'Last week' : `${week + 1} weeks ago`
    weeklyCompletions[weekLabel] = (weeklyCompletions[weekLabel] ?? 0) + 1
  }

  // ── Generate AI behaviour analysis ─────────────────────────────────────
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{
      role: 'user',
      content: `You are an intelligent productivity analyst reviewing 4 weeks of someone's work patterns.

RAW DATA:
- Total time tracked: ${Math.round(totalTime / 60 * 10) / 10}h over 28 days
- Tasks completed: ${completed.length}
- Tasks still pending: ${pending.length}
- Overdue tasks: ${overdueCount} (${Math.round(overdueRate * 100)}% of pending)

Time by day of week (minutes):
${Object.entries(timeByDay).map(([d, m]) => `${d}: ${Math.round(m / 60 * 10) / 10}h`).join(', ')}

Tasks completed by day:
${Object.entries(tasksByDay).map(([d, n]) => `${d}: ${n} tasks`).join(', ')}

Peak productivity hour: ${peakHour ? `${peakHour}:00` : 'unknown'}

Estimation accuracy: ${avgEstimationRatio !== null ? `${Math.round(avgEstimationRatio * 100)}% (tasks take ${avgEstimationRatio > 1 ? Math.round((avgEstimationRatio - 1) * 100) + '% longer' : Math.round((1 - avgEstimationRatio) * 100) + '% shorter'} than estimated on average)` : 'insufficient data'}

Time by project (top 5): ${Object.entries(timeByProject).sort((a,b) => b[1]-a[1]).slice(0,5).map(([p,m]) => `${p}: ${Math.round(m/60*10)/10}h`).join(', ')}

Weekly completion trend: ${JSON.stringify(weeklyCompletions)}

Write a behaviour insights report as a JSON object. Be SPECIFIC — use the actual numbers. Be direct, warm, and human — like a smart colleague who's looked at the data.

Return ONLY valid JSON:
{
  "headline": "One punchy sentence summarising the most important pattern (max 12 words)",
  "patterns": [
    {
      "title": "Pattern name (3-5 words)",
      "observation": "What the data actually shows — be specific with numbers (2 sentences)",
      "impact": "What this means for their productivity (1 sentence)",
      "suggestion": "One concrete, actionable change (1 sentence)",
      "type": "positive|warning|neutral"
    }
  ],
  "weeklyScore": {
    "score": 0-100,
    "label": "2-3 word label e.g. 'Strong week' or 'Needs focus'",
    "trend": "improving|declining|stable"
  },
  "coachingTip": "One specific tip based on their actual patterns — not generic advice (1-2 sentences)"
}

Include 3-4 patterns. Mix positive and constructive. Focus on the most actionable insights.`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  let analysis: any
  try {
    analysis = JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 })
  }

  return NextResponse.json({
    hasEnoughData: true,
    analysis,
    rawStats: {
      totalHours: Math.round(totalTime / 60 * 10) / 10,
      tasksCompleted: completed.length,
      tasksPending: pending.length,
      overdueCount,
      peakHour: peakHour ? parseInt(peakHour) : null,
      mostProductiveDay,
      leastProductiveDay,
      avgEstimationRatio,
      timeByProject: Object.fromEntries(
        Object.entries(timeByProject)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([k, v]) => [k, Math.round(v / 60 * 10) / 10])
      ),
      weeklyCompletions,
    },
  })
}
