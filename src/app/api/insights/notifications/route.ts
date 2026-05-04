import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ count: 0, items: [] })

  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, deadline, priority, project:projects(name, colour)')
    .eq('user_id', userId)
    .neq('status', 'done')
    .not('deadline', 'is', null)
    .lte('deadline', tomorrow.toISOString())
    .order('deadline', { ascending: true })
    .limit(10)

  const items = (tasks ?? []).map(t => {
    const deadline = new Date(t.deadline!)
    const isOverdue = deadline < now
    const isToday = deadline.toDateString() === now.toDateString()
    return {
      id: t.id,
      title: t.title,
      type: isOverdue ? 'overdue' : isToday ? 'due_today' : 'due_tomorrow',
      project: (t as any).project?.name ?? null,
      colour: (t as any).project?.colour ?? '#2d7a4f',
      deadline: t.deadline,
    }
  })

  return NextResponse.json({ count: items.length, items })
}
