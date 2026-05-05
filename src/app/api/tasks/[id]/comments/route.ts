import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/tasks/[id]/comments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('task_comments')
    .select('*')
    .eq('task_id', id)
    .order('created_at', { ascending: true })

  // Attach display names via Clerk
  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  const userIds = [...new Set((data ?? []).map(c => c.user_id))]
  const users: Record<string, string> = {}
  for (const uid of userIds) {
    try {
      const u = await client.users.getUser(uid)
      users[uid] = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.emailAddresses[0]?.emailAddress || 'Unknown'
    } catch {}
  }

  return NextResponse.json((data ?? []).map((c: any) => ({ ...c, authorName: users[c.user_id] ?? 'Unknown', isOwn: c.user_id === userId })))
}

// POST /api/tasks/[id]/comments
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { body } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Comment body required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('task_comments')
    .insert({ task_id: id, user_id: userId, body: body.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/tasks/[id]/comments?comment_id=xxx
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const commentId = searchParams.get('comment_id')
  if (!commentId) return NextResponse.json({ error: 'comment_id required' }, { status: 400 })

  await supabaseAdmin
    .from('task_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId) // only own comments

  return NextResponse.json({ ok: true })
}
