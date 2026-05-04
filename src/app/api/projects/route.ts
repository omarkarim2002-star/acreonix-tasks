import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUserPlan } from '@/lib/gating'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const plan = await getUserPlan(userId)

  // Get user's team
  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
  const teamId = membership?.team_id ?? null

  // 1. Own projects (all plans)
  const { data: ownProjects } = await supabaseAdmin
    .from('projects')
    .select('*, tasks(id, status)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  // 2. Pro-shared projects (projects shared WITH this user by another Pro user)
  const { data: proSharedProjects } = await supabaseAdmin
    .from('projects')
    .select('*, tasks(id, status)')
    .eq('sharing_type', 'pro_share')
    .eq('shared_with_user_id', userId)
    .eq('status', 'active')

  // 3. Team-shared projects (projects shared within the user's team)
  let teamProjects: any[] = []
  if (teamId) {
    // Get team owner to check if their subscription is still active
    const { data: team } = await supabaseAdmin
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single()

    if (team?.owner_id) {
      const ownerPlan = await getUserPlan(team.owner_id)
      // Only show team projects if owner's plan is still active (team or pro)
      if (ownerPlan === 'team' || ownerPlan === 'pro') {
        const { data: tp } = await supabaseAdmin
          .from('projects')
          .select('*, tasks(id, status)')
          .eq('sharing_type', 'team_share')
          .eq('team_id', teamId)
          .neq('user_id', userId) // Don't double-show own projects
          .eq('status', 'active')
        teamProjects = tp ?? []
      }
    }
  }

  const allProjects = [
    ...(ownProjects ?? []).map(p => ({ ...p, access_type: 'own', sharing_colour: null })),
    ...(proSharedProjects ?? []).map(p => ({ ...p, access_type: 'pro_share', sharing_colour: '#7c3aed' })),
    ...teamProjects.map(p => ({ ...p, access_type: 'team_share', sharing_colour: '#2563eb' })),
  ]

  return NextResponse.json(allProjects)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const COLOURS = ['#2d7a4f','#c9a84c','#3b82f6','#8b5cf6','#ec4899','#f97316','#14b8a6']
  const EMOJIS  = ['📁','🚀','💼','🎯','⚡','🌟','🔧','📊','🎨','💡']

  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert({
      user_id:      userId,
      name:         body.name,
      description:  body.description ?? null,
      colour:       body.colour ?? COLOURS[Math.floor(Math.random() * COLOURS.length)],
      icon:         body.icon    ?? EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      status:       'active',
      sharing_type: 'private',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
