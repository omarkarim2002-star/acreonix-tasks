import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/tasks/[id]/dependencies — get what this task depends on
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params

  const { data } = await supabaseAdmin
    .from('task_dependencies')
    .select('depends_on, task:tasks!task_dependencies_depends_on_fkey(id, title, status, priority)')
    .eq('task_id', id)
    .eq('user_id', userId)

  return NextResponse.json(data ?? [])
}

// POST /api/tasks/[id]/dependencies — add a dependency
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params
  const { dependsOn } = await req.json()

  if (!dependsOn) return NextResponse.json({ error: 'dependsOn required' }, { status: 400 })
  if (dependsOn === id) return NextResponse.json({ error: 'Task cannot depend on itself' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('task_dependencies')
    .insert({ task_id: id, depends_on: dependsOn, user_id: userId })
    .select()
    .single()

  if (error?.code === '23505') return NextResponse.json({ error: 'Dependency already exists' }, { status: 400 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/tasks/[id]/dependencies?depends_on=uuid
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const dependsOn = searchParams.get('depends_on')
  if (!dependsOn) return NextResponse.json({ error: 'depends_on required' }, { status: 400 })

  await supabaseAdmin
    .from('task_dependencies')
    .delete()
    .eq('task_id', id)
    .eq('depends_on', dependsOn)
    .eq('user_id', userId)

  return NextResponse.json({ ok: true })
}
