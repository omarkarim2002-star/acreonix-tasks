import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { sourceId, targetId, newName } = await req.json()

  if (!sourceId || !targetId || sourceId === targetId) {
    return NextResponse.json({ error: 'Invalid project IDs' }, { status: 400 })
  }

  // Verify both projects belong to this user
  const { data: projects } = await supabaseAdmin
    .from('projects')
    .select('id, name, user_id')
    .in('id', [sourceId, targetId])
    .eq('user_id', userId)

  if (!projects || projects.length !== 2) {
    return NextResponse.json({ error: 'Projects not found' }, { status: 404 })
  }

  const target = projects.find(p => p.id === targetId)!

  // 1. Move all tasks from source → target
  const { error: tasksErr } = await supabaseAdmin
    .from('tasks')
    .update({ project_id: targetId })
    .eq('project_id', sourceId)
    .eq('user_id', userId)

  if (tasksErr) return NextResponse.json({ error: tasksErr.message }, { status: 500 })

  // 2. Move calendar events that reference source project tasks
  // (calendar events reference task_id not project_id directly, tasks are already moved)

  // 3. Rename target project if newName provided
  const finalName = newName?.trim() || target.name
  const { error: renameErr } = await supabaseAdmin
    .from('projects')
    .update({ name: finalName, updated_at: new Date().toISOString() })
    .eq('id', targetId)
    .eq('user_id', userId)

  if (renameErr) return NextResponse.json({ error: renameErr.message }, { status: 500 })

  // 4. Archive the source project (don't delete — preserves history)
  const { error: archiveErr } = await supabaseAdmin
    .from('projects')
    .update({ status: 'archived', name: `[Merged] ${projects.find(p => p.id === sourceId)!.name}` })
    .eq('id', sourceId)
    .eq('user_id', userId)

  if (archiveErr) return NextResponse.json({ error: archiveErr.message }, { status: 500 })

  // Count what was moved
  const { count } = await supabaseAdmin
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', targetId)
    .eq('user_id', userId)

  return NextResponse.json({
    success: true,
    mergedProjectId: targetId,
    mergedProjectName: finalName,
    taskCount: count ?? 0,
  })
}
