import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function nextRecurDate(currentDeadline: string | null, recurType: string): string {
  const base = currentDeadline ? new Date(currentDeadline) : new Date()
  const next = new Date(base)
  if (recurType === 'daily')   next.setDate(base.getDate() + 1)
  if (recurType === 'weekly')  next.setDate(base.getDate() + 7)
  if (recurType === 'monthly') next.setMonth(base.getMonth() + 1)
  return next.toISOString()
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*, project:projects(id, name, colour, icon)')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const allowed = [
    'title', 'description', 'status', 'priority', 'deadline',
    'estimated_minutes', 'tags', 'project_id', 'position',
    'completed_at', 'recur_type', 'logged_minutes',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // ── Recurring task auto-generation ────────────────────────────────────────
  // When a task is marked done AND has recur_type set, create the next instance
  if (body.status === 'done') {
    // Fetch current task to get recur_type and deadline
    const { data: current } = await supabaseAdmin
      .from('tasks')
      .select('recur_type, deadline, title, description, priority, estimated_minutes, tags, project_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    const recurType = body.recur_type ?? current?.recur_type ?? 'none'

    if (current && recurType && recurType !== 'none') {
      const nextDeadline = nextRecurDate(current.deadline, recurType)

      // Create the next recurring instance
      await supabaseAdmin.from('tasks').insert({
        user_id:           userId,
        title:             current.title,
        description:       current.description,
        priority:          current.priority,
        estimated_minutes: current.estimated_minutes,
        tags:              current.tags,
        project_id:        current.project_id,
        status:            'todo',
        deadline:          nextDeadline,
        recur_type:        recurType,
        parent_task_id:    id,
        position:          0,
      })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*, project:projects(id, name, colour, icon)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params

  const { error } = await supabaseAdmin
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
