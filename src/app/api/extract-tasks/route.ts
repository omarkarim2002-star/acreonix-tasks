import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Extract all tasks from the text below. Group related tasks into projects. Return ONLY valid JSON, no markdown.\n\nText:\n"""\n${text}\n"""\n\nReturn:\n{\n  "projects": ["Project Name 1"],\n  "tasks": [\n    {\n      "title": "Clear task title",\n      "description": "Optional detail",\n      "priority": "low|medium|high|urgent",\n      "estimatedMinutes": 30,\n      "deadline": "2026-05-10T00:00:00Z or null",\n      "tags": [],\n      "suggestedProject": "Project Name 1"\n    }\n  ],\n  "summary": "One sentence summary"\n}`
    }]
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  let extracted: any
  try { extracted = JSON.parse(rawText.replace(/```json|```/g,'').trim()) }
  catch { return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 }) }

  const projectMap: Record<string,string> = {}
  const COLOURS = ['#2d7a4f','#c9a84c','#3b82f6','#8b5cf6','#ec4899','#f97316','#14b8a6']
  const EMOJIS = ['📁','🚀','💼','🎯','⚡','🌟','🔧','📊']

  for (const projectName of extracted.projects) {
    const { data: existing } = await supabaseAdmin.from('projects').select('id').eq('user_id',userId).ilike('name',projectName).single()
    if (existing) { projectMap[projectName] = existing.id; continue }
    const { data: np } = await supabaseAdmin.from('projects').insert({user_id:userId,name:projectName,colour:COLOURS[Math.floor(Math.random()*COLOURS.length)],icon:EMOJIS[Math.floor(Math.random()*EMOJIS.length)]}).select('id').single()
    if (np) projectMap[projectName] = np.id
  }

  const { data: createdTasks, error } = await supabaseAdmin.from('tasks').insert(
    extracted.tasks.map((t:any) => ({user_id:userId,project_id:t.suggestedProject?projectMap[t.suggestedProject]??null:null,title:t.title,description:t.description??null,priority:t.priority??'medium',estimated_minutes:t.estimatedMinutes??null,deadline:t.deadline??null,tags:t.tags??[],ai_extracted:true,raw_input:text}))
  ).select()

  if (error) return NextResponse.json({ error: 'Failed to save tasks' }, { status: 500 })
  return NextResponse.json({ success:true, summary:extracted.summary, projectsCreated:Object.keys(projectMap).length, tasksCreated:createdTasks?.length??0 })
}
