import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// GET — fetch yesterday's scheduled tasks + generate AI greeting
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rl = await checkRateLimit(userId, 'daily-checkin')
  if (!rl.allowed) return rateLimitResponse(rl)

  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yStart = new Date(yesterday.setHours(0,0,0,0)).toISOString()
  const yEnd   = new Date(yesterday.setHours(23,59,59,999)).toISOString()

  // Get yesterday's scheduled task blocks
  const { data: events } = await supabaseAdmin
    .from('calendar_events')
    .select('task_id, title, start_time, end_time, type')
    .eq('user_id', userId)
    .eq('type', 'ai_generated')
    .gte('start_time', yStart)
    .lte('end_time', yEnd)
    .not('task_id', 'is', null)

  if (!events?.length) {
    return NextResponse.json({ tasks: [], greeting: null })
  }

  // Deduplicate by task_id, get task status
  const taskIds = [...new Set(events.map(e => e.task_id).filter(Boolean))]

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, status, priority, project:projects(name)')
    .in('id', taskIds)

  // Only show tasks that are still pending (not done)
  const pendingTasks = (tasks ?? []).filter(t => t.status !== 'done')

  if (!pendingTasks.length) {
    return NextResponse.json({ tasks: [], greeting: null })
  }

  // Get user's first name for personalisation
  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const firstName = user.firstName ?? 'there'

  // Get day context
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const yesterdayName = dayNames[yesterday.getDay()]
  const hour = now.getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  // Calculate how packed yesterday was
  const scheduledCount = taskIds.length
  const pendingCount = pendingTasks.length
  const completedCount = scheduledCount - pendingCount

  // Generate AI greeting
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `You are a warm, intelligent productivity coach checking in with ${firstName} at the start of a new day.

Context:
- It's ${timeOfDay} on ${dayNames[now.getDay()]}
- Yesterday (${yesterdayName}) they had ${scheduledCount} tasks scheduled
- They completed ${completedCount} of them
- ${pendingCount} task${pendingCount > 1 ? 's are' : ' is'} still pending: ${pendingTasks.map(t => `"${t.title}"`).join(', ')}

Write a SHORT, warm, human check-in message (2-3 sentences max). Be direct and genuine — not corporate. 
- Acknowledge what they had on yesterday briefly
- Ask them to quickly confirm what they got done
- Keep it conversational, like a smart colleague checking in
- Don't use filler words like "certainly" or "absolutely"
- NO bullet points, NO lists — just natural flowing sentences

Example tone: "Looks like you had a full ${yesterdayName}. Before we plan today, let's quickly check off what you actually got done — it'll help me plan the rest of the week smarter."`,
    }],
  })

  const greeting = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  return NextResponse.json({
    tasks: pendingTasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      project: Array.isArray((t as any).project) ? (t as any).project[0]?.name : (t as any).project?.name,
    })),
    greeting,
    scheduledCount,
    completedCount,
  })
}

// POST — save completions + time logs
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { completions } = await req.json()
  // completions: [{ taskId, done: boolean, minutesSpent: number | null }]

  if (!Array.isArray(completions)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const now = new Date().toISOString()

  for (const item of completions) {
    if (!item.taskId) continue

    if (item.done) {
      // Mark task as done
      await supabaseAdmin
        .from('tasks')
        .update({ status: 'done', completed_at: now })
        .eq('id', item.taskId)
        .eq('user_id', userId)

      // Log time if provided
      if (item.minutesSpent && item.minutesSpent > 0) {
        const started = new Date()
        started.setMinutes(started.getMinutes() - item.minutesSpent)
        await supabaseAdmin
          .from('time_logs')
          .insert({
            user_id: userId,
            task_id: item.taskId,
            started_at: started.toISOString(),
            ended_at: now,
            duration_minutes: item.minutesSpent,
            note: 'Logged via daily check-in',
          })
      }
    }
    // If not done — leave as-is, the reschedule nudge will handle it
  }

  return NextResponse.json({ success: true, processed: completions.length })
}
