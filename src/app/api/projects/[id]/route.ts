import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params

  // Allow access if own project OR shared with user's team
  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
  const teamId = membership?.team_id

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*, tasks(*)')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Access check
  const isOwn = data.user_id === userId
  const isSharedWithMyTeam = data.shared_with_team && data.team_id === teamId

  if (!isOwn && !isSharedWithMyTeam) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ ...data, isOwn, isShared: isSharedWithMyTeam && !isOwn })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  // Must own the project to patch it
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!project || project.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const allowed = ['name', 'description', 'colour', 'icon', 'status', 'position', 'shared_with_team', 'team_id']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // If sharing with team, get user's team_id automatically
  if (body.shared_with_team === true && !body.team_id) {
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (membership?.team_id) {
      updates.team_id = membership.team_id
    }
  }

  // If unsharing, clear team_id
  if (body.shared_with_team === false) {
    updates.team_id = null
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params

  const { error } = await supabaseAdmin
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
