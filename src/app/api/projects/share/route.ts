import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUserPlan } from '@/lib/gating'
import { sendEmail, proShareInviteEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const { project_id, sharing_type, invitee_email } = body

  if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

  // Verify ownership
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id, name, user_id')
    .eq('id', project_id)
    .eq('user_id', userId)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const plan = await getUserPlan(userId)

  // Handle pro_share — invite a specific user by email
  if (sharing_type === 'pro_share') {
    if (plan !== 'pro' && plan !== 'team') {
      return NextResponse.json({ error: 'Pro plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 })
    }
    if (!invitee_email?.trim()) {
      return NextResponse.json({ error: 'invitee_email required for pro share' }, { status: 400 })
    }

    // Check pro share limit (max 5)
    const { count } = await supabaseAdmin
      .from('pro_share_invites')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project_id)
      .eq('owner_id', userId)
      .in('status', ['pending', 'accepted'])

    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: 'Max 5 pro share invites per project', code: 'SHARE_LIMIT' }, { status: 402 })
    }

    // Create invite
    const { data: invite, error } = await supabaseAdmin
      .from('pro_share_invites')
      .insert({
        project_id,
        owner_id: userId,
        invitee_email: invitee_email.toLowerCase().trim(),
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update project sharing_type
    await supabaseAdmin
      .from('projects')
      .update({ sharing_type: 'pro_share' })
      .eq('id', project_id)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!
    const inviteUrl = `${appUrl}/invite/pro/${invite.token}`

    // Get inviter name
    const { clerkClient } = await import('@clerk/nextjs/server')
    const client = await clerkClient()
    const inviter = await client.users.getUser(userId)
    const inviterName = [inviter.firstName, inviter.lastName].filter(Boolean).join(' ') || 'Someone'

    // Send email
    const { subject, html } = proShareInviteEmail({
      inviterName,
      projectName: project.name,
      inviteUrl,
      recipientEmail: invitee_email,
    })

    const emailResult = await sendEmail({ to: invitee_email, subject, html })

    return NextResponse.json({
      invite,
      inviteUrl,
      emailSent: emailResult.success,
    }, { status: 201 })
  }

  // Handle team_share — share with whole team
  if (sharing_type === 'team_share') {
    if (plan !== 'team') {
      return NextResponse.json({ error: 'Team plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 })
    }
    await supabaseAdmin
      .from('projects')
      .update({ sharing_type: 'team_share', shared_with_team: true })
      .eq('id', project_id)

    return NextResponse.json({ success: true, sharing_type: 'team_share' })
  }

  // Handle private
  if (sharing_type === 'private') {
    await supabaseAdmin
      .from('projects')
      .update({ sharing_type: 'private', shared_with_team: false })
      .eq('id', project_id)
    return NextResponse.json({ success: true, sharing_type: 'private' })
  }

  return NextResponse.json({ error: 'Invalid sharing_type' }, { status: 400 })
}
