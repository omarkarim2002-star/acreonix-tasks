import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Invalid invite' }, { status: 400 })

  // Look up invite
  const { data: invite } = await supabaseAdmin
    .from('team_invites')
    .select('*, teams(name)')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!invite) return NextResponse.json({ error: 'Invite expired or already used' }, { status: 404 })

  // Get user email
  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const email = user.emailAddresses[0]?.emailAddress?.toLowerCase() ?? ''

  // Validate email matches invite
  if (email !== invite.email) {
    return NextResponse.json({
      error: `This invite was sent to ${invite.email}. You're signed in as ${email}.`,
    }, { status: 403 })
  }

  // Check not already a member
  const { data: existing } = await supabaseAdmin
    .from('team_members')
    .select('id')
    .eq('team_id', invite.team_id)
    .eq('user_id', userId)
    .neq('status', 'removed')
    .single()

  if (existing) return NextResponse.json({ error: 'Already a team member' }, { status: 400 })

  // Add member
  await supabaseAdmin.from('team_members').insert({
    team_id: invite.team_id,
    user_id: userId,
    email,
    role: 'member',
    status: 'active',
    joined_at: new Date().toISOString(),
  })

  // Mark invite accepted
  await supabaseAdmin.from('team_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

  return NextResponse.json({ teamName: (invite as any).teams?.name })
}
