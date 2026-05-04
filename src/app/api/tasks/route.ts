import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')
  const status = searchParams.get('status')
  let query = supabaseAdmin.from('tasks').select('*, project:projects(id,name,colour,icon)').eq('user_id',userId).order('created_at',{ascending:false})
  if (projectId) query = query.eq('project_id',projectId)
  if (status) query = query.eq('status',status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { title, description, project_id, priority, deadline, estimated_minutes, tags } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('tasks').insert({user_id:userId,title:title.trim(),description,project_id:project_id??null,priority:priority??'medium',deadline:deadline??null,estimated_minutes:estimated_minutes??null,tags:tags??[]}).select('*, project:projects(id,name,colour,icon)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
