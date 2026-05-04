import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUserPlan } from '@/lib/gating'

// POST /api/projects/share — invite another Pro user to a project
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { projectId, email } = await req.json()
  if (!projectId || !email) return NextResponse.json({ error: 'projectId and email required' }, { status: 400 })

  const plan = await getUserPlan(userId)
  if (plan === 'free') {
    return NextResponse.json({ error: 'Pro plan required to share projects', code: 'PRO_REQUIRED' }, { status: 402 })
  }

  // Verify ownership
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, name, user_id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found or not yours' }, { status: 404 })

  // Check Pro share limit (5 max for pro plan)
  if (plan === 'pro') {
    const { count } = await supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('sharing_type', 'pro_share')
      .eq('status', 'active')

    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: 'Pro sharing limit reached — maximum 5 shared lists', code: 'PRO_SHARE_LIMIT' }, { status: 402 })
    }
  }

  // Check not already shared
  const { data: existing } = await supabaseAdmin
    .from('pro_share_invites')
    .select('id, status')
    .eq('project_id', projectId)
    .eq('invitee_email', email.toLowerCase())
    .in('status', ['pending', 'accepted'])
    .single()

  if (existing) return NextResponse.json({ error: 'Already shared with this user' }, { status: 400 })

  // Create invite
  const { data: invite } = await supabaseAdmin
    .from('pro_share_invites')
    .insert({
      project_id: projectId,
      owner_id: userId,
      invitee_email: email.toLowerCase().trim(),
    })
    .select()
    .single()

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/project/${invite.token}`

  // Update project sharing_type
  await supabaseAdmin
    .from('projects')
    .update({ sharing_type: 'pro_share' })
    .eq('id', projectId)

  return NextResponse.json({ invite, inviteUrl }, { status: 201 })
}

// POST /api/projects/share/accept — accept a pro share invite
export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { token } = await req.json()

  const { data: invite } = await supabaseAdmin
    .from('pro_share_invites')
    .select('*, projects(name, user_id)')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (!invite) return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 })

  // Check invitee has Pro plan (must be Pro to access shared projects)
  const inviteePlan = await getUserPlan(userId)
  if (inviteePlan === 'free') {
    return NextResponse.json({ error: 'Pro plan required to join shared projects', code: 'PRO_REQUIRED' }, { status: 402 })
  }

  // Update invite + project
  await supabaseAdmin.from('pro_share_invites').update({
    status: 'accepted',
    invitee_user_id: userId,
    accepted_at: new Date().toISOString(),
  }).eq('id', invite.id)

  await supabaseAdmin.from('projects').update({
    shared_with_user_id: userId,
    sharing_type: 'pro_share',
  }).eq('id', invite.project_id)

  return NextResponse.json({ projectName: (invite as any).projects?.name })
}
