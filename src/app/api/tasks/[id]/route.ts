import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params
  const { data, error } = await supabaseAdmin.from('tasks').select('*, project:projects(id,name,colour,icon)').eq('id',id).eq('user_id',userId).single()
  if (error||!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const allowed = ['title','description','status','priority','deadline','estimated_minutes','tags','project_id','position']
  const updates: Record<string,unknown> = {}
  for (const key of allowed) { if (key in body) updates[key] = body[key] }
  const { data, error } = await supabaseAdmin.from('tasks').update(updates).eq('id',id).eq('user_id',userId).select('*, project:projects(id,name,colour,icon)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { id } = await params
  const { error } = await supabaseAdmin.from('tasks').delete().eq('id',id).eq('user_id',userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
