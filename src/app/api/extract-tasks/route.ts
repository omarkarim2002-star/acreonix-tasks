import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'
import type { ExtractResult } from '@/types'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  // Step 1: Extract tasks with Claude Haiku
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are a task extraction assistant. Extract all tasks from the following text and structure them into projects.

TODAY'S DATE: ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })})
Use this to calculate deadlines — "by Thursday" means the coming Thursday from today's date, "next week" means 7+ days from today, "end of month" means the last day of the current month. Always use future dates relative to TODAY.

Rules:
- Group related tasks into logical projects (e.g. "Website Redesign", "Client Work", "Personal")
- If a task already implies a project, use that
- Estimate realistic time for each task (estimatedMinutes)
- Identify urgency from context clues
- Return ONLY valid JSON, no markdown, no explanation

Text to extract from:
"""
${text}
"""

Return this exact JSON structure:
{
  "projects": ["Project Name 1", "Project Name 2"],
  "tasks": [
    {
      "title": "Clear action-oriented task title",
      "description": "Optional extra detail if relevant",
      "priority": "low|medium|high|urgent",
      "estimatedMinutes": 30,
      "deadline": "YYYY-MM-DDT00:00:00Z or null",
      "tags": ["tag1", "tag2"],
      "suggestedProject": "Project Name 1"
    }
  ],
  "summary": "One sentence summary of what was extracted"
}`,
      },
    ],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

  let extracted: ExtractResult
  try {
    extracted = JSON.parse(rawText.replace(/```json|```/g, '').trim())
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  // Step 2: Upsert projects into DB
  const projectMap: Record<string, string> = {}

  for (const projectName of extracted.projects) {
    // Check if project already exists
    const { data: existing } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', projectName)
      .single()

    if (existing) {
      projectMap[projectName] = existing.id
    } else {
      const { data: newProject } = await supabaseAdmin
        .from('projects')
        .insert({
          user_id: userId,
          name: projectName,
          colour: randomColour(),
          icon: randomEmoji(),
        })
        .select('id')
        .single()

      if (newProject) projectMap[projectName] = newProject.id
    }
  }

  // Step 3: Insert tasks
  const taskInserts = extracted.tasks.map((t) => ({
    user_id: userId,
    project_id: t.suggestedProject ? projectMap[t.suggestedProject] ?? null : null,
    title: t.title,
    description: t.description ?? null,
    priority: t.priority ?? 'medium',
    estimated_minutes: t.estimatedMinutes ?? null,
    deadline: t.deadline ?? null,
    tags: t.tags ?? [],
    ai_extracted: true,
    raw_input: text,
  }))

  const { data: createdTasks, error } = await supabaseAdmin
    .from('tasks')
    .insert(taskInserts)
    .select()

  if (error) {
    console.error('Task insert error:', error)
    return NextResponse.json({ error: 'Failed to save tasks' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    summary: extracted.summary,
    projectsCreated: Object.keys(projectMap).length,
    tasksCreated: createdTasks?.length ?? 0,
    tasks: createdTasks,
  })
}

const COLOURS = ['#2d7a4f', '#c9a84c', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6']
const EMOJIS = ['📁', '🚀', '💼', '🎯', '⚡', '🌟', '🔧', '📊', '🎨', '💡']

function randomColour() { return COLOURS[Math.floor(Math.random() * COLOURS.length)] }
function randomEmoji() { return EMOJIS[Math.floor(Math.random() * EMOJIS.length)] }
