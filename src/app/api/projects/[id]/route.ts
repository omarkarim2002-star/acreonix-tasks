import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUserPlan } from '@/lib/gating'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*, tasks(*)')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Access check
  const isOwn = data.user_id === userId

  // Pro share — shared directly with this user
  const isProShared = data.sharing_type === 'pro_share' && data.shared_with_user_id === userId

  // Team share — user is in the same team
  let isTeamShared = false
  if (data.sharing_type === 'team_share' && data.team_id) {
    const { data: m } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', data.team_id)
      .eq('status', 'active')
      .single()
    isTeamShared = !!m
  }

  if (!isOwn && !isProShared && !isTeamShared) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const accessType = isOwn ? 'own' : isProShared ? 'pro_share' : 'team_share'
  const sharingColour = isProShared ? '#7c3aed' : isTeamShared ? '#2563eb' : null

  return NextResponse.json({ ...data, isOwn, accessType, sharingColour })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  // Must own to patch
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('user_id, sharing_type')
    .eq('id', id)
    .single()

  if (!project || project.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Handle sharing_type changes
  if (body.sharing_type !== undefined) {
    const plan = await getUserPlan(userId)

    if (body.sharing_type === 'pro_share') {
      // Requires Pro plan
      if (plan !== 'pro' && plan !== 'team') {
        return NextResponse.json({ error: 'Pro plan required to share projects', code: 'PRO_REQUIRED' }, { status: 402 })
      }
      // Check Pro share limit (5 max)
      if (plan === 'pro') {
        const { count } = await supabaseAdmin
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('sharing_type', 'pro_share')
          .eq('status', 'active')
          .neq('id', id) // exclude current

        if ((count ?? 0) >= 5) {
          return NextResponse.json({ error: 'Pro sharing limit reached (5 shared lists)', code: 'PRO_SHARE_LIMIT' }, { status: 402 })
        }
      }
    }

    if (body.sharing_type === 'team_share') {
      // Requires Team plan
      if (plan !== 'team') {
        return NextResponse.json({ error: 'Team plan required for team sharing', code: 'TEAM_REQUIRED' }, { status: 402 })
      }
      // Auto-set team_id
      if (!body.team_id) {
        const { data: m } = await supabaseAdmin
          .from('team_members')
          .select('team_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single()
        if (m?.team_id) body.team_id = m.team_id
      }
    }

    if (body.sharing_type === 'private') {
      // Unsharing — clear related fields
      body.team_id = null
      body.shared_with_user_id = null
      body.shared_with_team = false
    }
  }

  const allowed = ['name','description','colour','icon','status','position',
                   'sharing_type','team_id','shared_with_user_id','shared_with_team']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
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
    .update({ status: 'archived', sharing_type: 'private', team_id: null })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
