import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { checkAiExtractLimit, checkProjectLimit, incrementUsage } from '@/lib/gating'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Check AI extract limit
  const { allowed, used, limit } = await checkAiExtractLimit(userId)
  if (!allowed) {
    return NextResponse.json({
      error: 'limit_reached',
      code: 'AI_EXTRACT_LIMIT',
      message: `You've used all ${limit} AI extracts this month.`,
      used,
      limit,
    }, { status: 402 })
  }

  const body = await req.json(); const rawText = body.rawText ?? body.text
  if (!rawText?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  // Check project limit before extracting
  const projectCheck = await checkProjectLimit(userId)

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Extract tasks from this text. Group into logical projects.
${projectCheck.current >= projectCheck.limit ? `NOTE: User is on free plan with ${projectCheck.limit} project limit. They currently have ${projectCheck.current} projects. Only create tasks for existing project categories, do not suggest new project names — assign to 'General' if unclear.` : ''}

Text: "${rawText}"

Return ONLY valid JSON:
{
  "projects": [
    {
      "name": "Project name",
      "icon": "emoji",
      "colour": "#hex",
      "tasks": [
        {
          "title": "Task title",
          "description": "Brief description or null",
          "priority": "low|medium|high|urgent",
          "estimatedMinutes": 30,
          "deadline": "YYYY-MM-DD or null",
          "tags": []
        }
      ]
    }
  ],
  "summary": "One sentence summary"
}`
    }]
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim())
    // Increment usage after successful extract
    await incrementUsage(userId, 'ai_extracts')
    return NextResponse.json({ ...result, usedExtract: true, extractsRemaining: limit === Infinity ? null : limit - used - 1 })
  } catch {
    return NextResponse.json({ error: 'Failed to parse response' }, { status: 500 })
  }
}
