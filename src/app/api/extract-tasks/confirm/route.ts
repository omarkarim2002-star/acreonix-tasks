import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const COLOURS = ['#2d7a4f','#c9a84c','#3b82f6','#8b5cf6','#ec4899','#f97316','#14b8a6']
const EMOJIS  = ['📁','🚀','💼','🎯','⚡','🌟','🔧','📊','🎨','💡']
const rnd = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

function cleanDate(val: unknown): string | null {
  if (!val) return null
  const s = String(val).trim()
  if (!s || s === 'null' || s === 'undefined') return null
  try {
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rl = await checkRateLimit(userId, 'extract-confirm')
  if (!rl.allowed) return rateLimitResponse(rl)

  const { tasks, originalText } = await req.json()
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json({ error: 'No tasks provided' }, { status: 400 })
  }

  // Upsert projects
  const projectNames = [...new Set(
    tasks.map((t: any) => t.suggestedProject).filter((n: any) => n && typeof n === 'string' && n.trim())
  )] as string[]

  const projectMap: Record<string, string> = {}
  for (const name of projectNames) {
    const { data: existing } = await supabaseAdmin
      .from('projects').select('id').eq('user_id', userId).ilike('name', name.trim()).single()
    if (existing) {
      projectMap[name] = existing.id
    } else {
      const { data: created } = await supabaseAdmin.from('projects')
        .insert({ user_id: userId, name: name.trim(), colour: rnd(COLOURS), icon: rnd(EMOJIS), status: 'active', sharing_type: 'private' })
        .select('id').single()
      if (created) projectMap[name] = created.id
    }
  }

  const inserts = tasks.map((t: any) => ({
    user_id:                    userId,
    title:                      String(t.title ?? '').trim() || 'Untitled task',
    description:                t.description ? String(t.description).trim() || null : null,
    project_id:                 t.suggestedProject ? (projectMap[t.suggestedProject] ?? null) : null,
    priority:                   ['low','medium','high','urgent'].includes(t.priority) ? t.priority : 'medium',
    estimated_minutes:          t.estimatedMinutes ? Number(t.estimatedMinutes) || null : null,
    deadline:                   cleanDate(t.deadline),
    tags:                       Array.isArray(t.tags) ? t.tags : [],
    task_type:                  ['work','business','personal'].includes(t.task_type) ? t.task_type : 'work',
    schedulable_outside_hours:  t.schedulable_outside_hours === true,
    ai_extracted:               true,
    status:                     'todo',
  }))

  const { data: created, error } = await supabaseAdmin.from('tasks').insert(inserts).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, tasksCreated: created?.length ?? 0 })
}
