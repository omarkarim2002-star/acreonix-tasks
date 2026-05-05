// GET /api/projects/[id]/public — returns read-only project data
// No auth required — this is the public share endpoint
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, name, colour, icon, description, status')
    .eq('id', id)
    .neq('status', 'archived')
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found or not shared' }, { status: 404 })

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, status, priority, deadline, tags, estimated_minutes')
    .eq('project_id', id)
    .neq('status', 'done')
    .order('priority', { ascending: false })

  const { count: totalCount } = await supabaseAdmin
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)

  const { count: doneCount } = await supabaseAdmin
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)
    .eq('status', 'done')

  return NextResponse.json({
    project,
    tasks: tasks ?? [],
    stats: {
      total: totalCount ?? 0,
      done: doneCount ?? 0,
      pct: totalCount ? Math.round(((doneCount ?? 0) / totalCount) * 100) : 0,
    },
  })
}
