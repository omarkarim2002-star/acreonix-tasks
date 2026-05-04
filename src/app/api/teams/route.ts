import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUserPlan } from '@/lib/gating'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Get team user belongs to (as owner or member)
  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('team_id, role, teams(id, name, owner_id)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (!membership) return NextResponse.json({ team: null, members: [] })

  const teamId = membership.team_id

  // Get all members
  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('id, user_id, email, role, status, joined_at')
    .eq('team_id', teamId)
    .neq('status', 'removed')
    .order('joined_at', { ascending: true })

  // Get pending invites
  const { data: invites } = await supabaseAdmin
    .from('team_invites')
    .select('id, email, created_at, expires_at')
    .eq('team_id', teamId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())

  return NextResponse.json({
    team: (membership as any).teams,
    myRole: membership.role,
    members: members ?? [],
    invites: invites ?? [],
  })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const plan = await getUserPlan(userId)
  if (plan !== 'team') {
    return NextResponse.json({ error: 'Team plan required', code: 'TEAM_REQUIRED' }, { status: 402 })
  }

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Team name required' }, { status: 400 })

  // Check user doesn't already own/belong to a team
  const { data: existing } = await supabaseAdmin
    .from('team_members')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (existing) return NextResponse.json({ error: 'Already in a team' }, { status: 400 })

  // Get user email from Clerk
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress ?? ''

  // Create team
  const { data: team, error: teamErr } = await supabaseAdmin
    .from('teams')
    .insert({ name: name.trim(), owner_id: userId })
    .select()
    .single()

  if (teamErr || !team) return NextResponse.json({ error: teamErr?.message }, { status: 500 })

  // Add owner as member
  await supabaseAdmin.from('team_members').insert({
    team_id: team.id,
    user_id: userId,
    email,
    role: 'owner',
    status: 'active',
    joined_at: new Date().toISOString(),
  })

  return NextResponse.json(team, { status: 201 })
}
