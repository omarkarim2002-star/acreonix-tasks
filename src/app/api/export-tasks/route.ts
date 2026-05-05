import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(cells: unknown[]): string {
  return cells.map(escapeCSV).join(',')
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorised', { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('project_id')

  // Fetch tasks
  let taskQuery = supabaseAdmin
    .from('tasks')
    .select('*, project:projects(name, colour, icon)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (projectId) taskQuery = taskQuery.eq('project_id', projectId)

  const { data: tasks, error } = await taskQuery
  if (error) return new Response(error.message, { status: 500 })

  // Fetch time logs for these tasks
  const taskIds = (tasks ?? []).map(t => t.id)
  const { data: timeLogs } = await supabaseAdmin
    .from('time_logs')
    .select('task_id, duration_minutes, started_at, note')
    .in('task_id', taskIds)

  // Build time log map: taskId → total minutes
  const timeByTask: Record<string, number> = {}
  for (const log of timeLogs ?? []) {
    timeByTask[log.task_id] = (timeByTask[log.task_id] ?? 0) + (log.duration_minutes ?? 0)
  }

  // Build CSV
  const headers = [
    'Title', 'Project', 'Status', 'Priority',
    'Deadline', 'Estimated (mins)', 'Logged (mins)',
    'Tags', 'AI Extracted', 'Created', 'Completed',
  ]

  const lines: string[] = [
    row(headers),
    ...(tasks ?? []).map(t => row([
      t.title,
      (t.project as any)?.name ?? '',
      t.status,
      t.priority,
      t.deadline ? new Date(t.deadline).toLocaleDateString('en-GB') : '',
      t.estimated_minutes ?? '',
      timeByTask[t.id] ?? 0,
      (t.tags ?? []).join('; '),
      t.ai_extracted ? 'Yes' : 'No',
      new Date(t.created_at).toLocaleDateString('en-GB'),
      t.completed_at ? new Date(t.completed_at).toLocaleDateString('en-GB') : '',
    ])),
  ]

  const csv = lines.join('\n')
  const filename = projectId
    ? `acreonix-tasks-export-${new Date().toISOString().split('T')[0]}.csv`
    : `acreonix-all-tasks-${new Date().toISOString().split('T')[0]}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
