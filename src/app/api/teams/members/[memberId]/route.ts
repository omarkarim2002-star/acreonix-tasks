import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { memberId } = await params

  // Verify requester is owner/admin of this team
  const { data: requester } = await supabaseAdmin
    .from('team_members')
    .select('team_id, role')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (!requester || !['owner', 'admin'].includes(requester.role)) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 403 })
  }

  // Get the member being removed
  const { data: target } = await supabaseAdmin
    .from('team_members')
    .select('team_id, role, user_id')
    .eq('id', memberId)
    .single()

  if (!target || target.team_id !== requester.team_id) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Cannot remove team owner' }, { status: 400 })
  }

  await supabaseAdmin
    .from('team_members')
    .update({ status: 'removed' })
    .eq('id', memberId)

  return NextResponse.json({ success: true })
}
