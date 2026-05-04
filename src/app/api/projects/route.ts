import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const includeShared = searchParams.get('shared') !== 'false'

  // Get user's team membership
  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  const teamId = membership?.team_id ?? null

  // Build query: own projects + shared team projects
  let query = supabaseAdmin
    .from('projects')
    .select('*, tasks(id, status)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (teamId && includeShared) {
    // Own projects OR projects shared with user's team
    query = query.or(`user_id.eq.${userId},and(team_id.eq.${teamId},shared_with_team.eq.true)`)
  } else {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark which are shared vs own
  const enriched = (data ?? []).map(p => ({
    ...p,
    isOwn: p.user_id === userId,
    isShared: p.shared_with_team && p.team_id === teamId && p.user_id !== userId,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const COLOURS = ['#2d7a4f','#c9a84c','#3b82f6','#8b5cf6','#ec4899','#f97316','#14b8a6']
  const EMOJIS = ['📁','🚀','💼','🎯','⚡','🌟','🔧','📊','🎨','💡']

  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert({
      user_id: userId,
      name: body.name,
      description: body.description ?? null,
      colour: body.colour ?? COLOURS[Math.floor(Math.random() * COLOURS.length)],
      icon: body.icon ?? EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
