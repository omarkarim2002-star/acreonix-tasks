import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkAiExtractLimit, checkProjectLimit, incrementUsage } from '@/lib/gating'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { allowed, used, limit } = await checkAiExtractLimit(userId)
  if (!allowed) {
    return NextResponse.json({
      error: 'limit_reached', code: 'AI_EXTRACT_LIMIT',
      message: `You've used your ${limit} AI extract${limit === 1 ? '' : 's'} this month. Upgrade for unlimited.`,
      used, limit,
    }, { status: 402 })
  }

  const body = await req.json()
  const rawText = body.rawText ?? body.text ?? ''
  if (!rawText.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  const projectCheck = await checkProjectLimit(userId)

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Extract all tasks from the text below. Classify each task and determine scheduling flexibility.

${projectCheck.current >= projectCheck.limit ? `IMPORTANT: User has reached their project limit (${projectCheck.limit}). Assign all tasks to "General" project only.` : ''}

Text: "${rawText}"

For each task, determine:
- task_type: "work" (professional/job tasks), "business" (entrepreneurial/side projects), or "personal" (health, fitness, family, errands, hobbies)
- schedulable_outside_hours: true if this task CAN be done outside standard 9-6 work hours (gym, personal errands, hobby projects, business side work) — false if it MUST happen during work hours (client calls, work meetings, office tasks)

Examples:
- "Go to gym" → personal, schedulable_outside_hours: true
- "Fix login bug" → work, schedulable_outside_hours: false
- "Work on my app" → business, schedulable_outside_hours: true
- "Call client re proposal" → work, schedulable_outside_hours: false
- "Pay invoice" → business, schedulable_outside_hours: true
- "Team standup" → work, schedulable_outside_hours: false
- "Write blog post" → business, schedulable_outside_hours: true

Return ONLY valid JSON, no markdown:
{
  "projects": ["Project Name 1"],
  "tasks": [
    {
      "title": "Clear action-oriented task title",
      "description": "Brief detail or null",
      "priority": "low|medium|high|urgent",
      "estimatedMinutes": 30,
      "deadline": "YYYY-MM-DDT00:00:00Z or null",
      "tags": [],
      "suggestedProject": "Project Name 1",
      "task_type": "work|business|personal",
      "schedulable_outside_hours": true
    }
  ],
  "summary": "One sentence summary"
}`,
    }],
  })

  const rawResp = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const result = JSON.parse(rawResp.replace(/```json|```/g, '').trim())
    const tasks = Array.isArray(result.tasks) ? result.tasks : []
    const projects = Array.isArray(result.projects) ? result.projects : []

    await incrementUsage(userId, 'ai_extracts')

    return NextResponse.json({
      tasks,
      projects,
      summary: result.summary ?? '',
      usedExtract: true,
      extractsRemaining: limit === Infinity ? null : limit - used - 1,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response — please try again' }, { status: 500 })
  }
}
