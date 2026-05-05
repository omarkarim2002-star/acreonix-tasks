// GET /api/dependencies — fetch all task dependencies for the user
// Used by mindmap to draw dashed edges between dependent tasks
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('task_dependencies')
    .select('task_id, depends_on')
    .eq('user_id', userId)

  return NextResponse.json(data ?? [])
}
