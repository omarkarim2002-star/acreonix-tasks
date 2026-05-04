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
      error: 'limit_reached',
      code: 'AI_EXTRACT_LIMIT',
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
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Extract all tasks from the text below. Group related tasks into logical projects.
${projectCheck.current >= projectCheck.limit ? `IMPORTANT: User has reached their project limit (${projectCheck.limit}). Assign all tasks to "General" project only.` : ''}

Text: "${rawText}"

Return ONLY valid JSON with this exact structure — no markdown, no explanation:
{
  "projects": ["Project Name 1", "Project Name 2"],
  "tasks": [
    {
      "title": "Clear action-oriented task title",
      "description": "Optional detail or null",
      "priority": "low|medium|high|urgent",
      "estimatedMinutes": 30,
      "deadline": "2026-05-10T00:00:00Z or null",
      "tags": [],
      "suggestedProject": "Project Name 1"
    }
  ],
  "summary": "One sentence summary of what was extracted"
}`,
    }],
  })

  const rawResp = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const result = JSON.parse(rawResp.replace(/```json|```/g, '').trim())

    // Always normalise to arrays — never let undefined reach the frontend
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
