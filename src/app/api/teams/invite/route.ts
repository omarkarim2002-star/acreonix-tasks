import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { PLAN_LIMITS } from '@/lib/plans'
import { getUserPlan } from '@/lib/gating'

// POST /api/teams/invite — send invite
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Get team
  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Not authorised to invite' }, { status: 403 })
  }

  const teamId = membership.team_id

  // Check member limit
  const plan = await getUserPlan(userId)
  const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.teamMembers ?? 1

  const { count } = await supabaseAdmin
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('status', 'active')

  if ((count ?? 0) >= limit) {
    return NextResponse.json({
      error: `Team member limit reached (${limit} on ${plan} plan)`,
      code: 'MEMBER_LIMIT',
    }, { status: 402 })
  }

  // Check not already a member
  const { data: existing } = await supabaseAdmin
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('email', email.toLowerCase())
    .neq('status', 'removed')
    .single()

  if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 400 })

  // Check not already invited
  const { data: existingInvite } = await supabaseAdmin
    .from('team_invites')
    .select('id')
    .eq('team_id', teamId)
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existingInvite) return NextResponse.json({ error: 'Invite already sent' }, { status: 400 })

  // Create invite
  const { data: invite, error } = await supabaseAdmin
    .from('team_invites')
    .insert({
      team_id: teamId,
      email: email.toLowerCase().trim(),
      invited_by: userId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const inviteUrl = `${appUrl}/invite/${invite.token}`

  // TODO: send email via Resend when enabled
  // For now return the invite URL so it can be shared manually

  return NextResponse.json({ invite, inviteUrl }, { status: 201 })
}
