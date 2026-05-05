import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import {
  Sparkles, ArrowRight, AlertCircle, Clock,
  TrendingUp, Zap, CheckCircle2, GitFork,
  Calendar, BarChart2, ChevronRight, AlertTriangle,
} from 'lucide-react'
import { TodayFocusPanel } from '@/components/ui/TodayFocusPanel'

// ── Types ────────────────────────────────────────────────────────────────────
type Task = {
  id: string
  title: string
  status: string
  priority: string
  deadline: string | null
  estimated_minutes: number | null
  project_id: string | null
  project?: { name: string; colour: string; icon: string } | null
  updated_at: string
}
type Project = {
  id: string; name: string; colour: string; icon: string
  description?: string | null; status: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDeadline(iso: string | null): string {
  if (!iso) return ''
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 6) return `${diff}d`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
function deadlineColor(iso: string | null): string {
  if (!iso) return '#aaa'
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diff < 0) return '#dc2626'
  if (diff <= 1) return '#ea580c'
  if (diff <= 3) return '#d97706'
  return '#888'
}
function greet(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
function priorityScore(p: string): number {
  return { urgent: 4, high: 3, medium: 2, low: 1 }[p] ?? 1
}
function daysSinceUpdated(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

// ── Nudge engine ─────────────────────────────────────────────────────────────
type Nudge = { id: string; type: 'deadline_risk' | 'stale' | 'overdue' | 'overload'; message: string; taskId?: string; projectId?: string; severity: 'high' | 'medium' }

function computeNudges(tasks: Task[], totalScheduledMins: number): Nudge[] {
  const nudges: Nudge[] = []
  const now = Date.now()

  // Overload warning — if scheduled work exceeds 7h
  if (totalScheduledMins > 420) {
    nudges.push({
      id: 'overload',
      type: 'overload',
      severity: 'high',
      message: `${Math.round(totalScheduledMins / 60)}h of work estimated today — consider moving lower-priority tasks.`,
    })
  }

  for (const task of tasks) {
    if (task.status === 'done') continue

    // Deadline risk — high priority, deadline in 1–2 days, not started
    if (task.deadline && task.priority === 'urgent' || task.priority === 'high') {
      const diff = Math.ceil((new Date(task.deadline!).getTime() - now) / 86400000)
      if (diff >= 0 && diff <= 2 && task.status === 'todo') {
        nudges.push({
          id: `risk-${task.id}`,
          type: 'deadline_risk',
          severity: 'high',
          message: `"${task.title}" is due ${diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : 'in 2 days'} and hasn't been started.`,
          taskId: task.id,
        })
      }
    }

    // Stale task — not touched in 5+ days, not completed
    if (task.priority !== 'low' && daysSinceUpdated(task.updated_at) >= 5) {
      nudges.push({
        id: `stale-${task.id}`,
        type: 'stale',
        severity: 'medium',
        message: `"${task.title}" hasn't been touched in ${daysSinceUpdated(task.updated_at)} days.`,
        taskId: task.id,
      })
    }
  }

  // Overdue tasks (separate from risk)
  const overdue = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done')
  if (overdue.length > 0 && !nudges.find(n => n.type === 'overdue')) {
    nudges.push({
      id: 'overdue',
      type: 'overdue',
      severity: 'high',
      message: `${overdue.length} task${overdue.length > 1 ? 's are' : ' is'} overdue and need${overdue.length === 1 ? 's' : ''} attention.`,
    })
  }

  // Cap at 3 nudges, prioritise high severity
  return nudges.sort((a, b) => (a.severity === 'high' ? -1 : 1)).slice(0, 3)
}

// ── Today's best order ────────────────────────────────────────────────────────
function computeTodayOrder(tasks: Task[]): Task[] {
  const now = new Date()
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59)

  return [...tasks]
    .filter(t => t.status !== 'done')
    .sort((a, b) => {
      // Score: priority + deadline urgency + estimated fit
      let sa = priorityScore(a.priority) * 10
      let sb = priorityScore(b.priority) * 10
      if (a.deadline) {
        const da = Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000)
        sa += da < 0 ? 40 : da === 0 ? 30 : da === 1 ? 20 : da <= 3 ? 10 : 0
      }
      if (b.deadline) {
        const db = Math.ceil((new Date(b.deadline).getTime() - Date.now()) / 86400000)
        sb += db < 0 ? 40 : db === 0 ? 30 : db === 1 ? 20 : db <= 3 ? 10 : 0
      }
      return sb - sa
    })
    .slice(0, 5)
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) return null

  const now = new Date()
  const todayStr = now.toDateString()

  // Fetch everything in parallel
  const [projectsRes, allTasksRes, calEventsRes] = await Promise.all([
    supabaseAdmin
      .from('projects')
      .select('id, name, colour, icon, description, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseAdmin
      .from('tasks')
      .select('id, title, status, priority, deadline, estimated_minutes, project_id, updated_at, project:projects(name, colour, icon)')
      .eq('user_id', userId)
      .neq('status', 'done')
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(40),
    supabaseAdmin
      .from('calendar_events')
      .select('start_time, end_time, type')
      .eq('user_id', userId)
      .gte('start_time', new Date(now.setHours(0, 0, 0, 0)).toISOString())
      .lte('end_time', new Date(now.setHours(23, 59, 59, 999)).toISOString()),
  ])

  const projects = (projectsRes.data ?? []) as Project[]
  const tasks = ((allTasksRes.data ?? []) as any[]).map(t => ({
    ...t,
    project: Array.isArray(t.project) ? t.project[0] ?? null : t.project ?? null,
  })) as Task[]
  const calEvents = calEventsRes.data ?? []

  // Compute today's scheduled work minutes
  const scheduledMins = calEvents
    .filter(e => e.type !== 'break' && e.type !== 'lunch')
    .reduce((sum, e) => {
      const s = new Date(e.start_time), en = new Date(e.end_time)
      return sum + (en.getTime() - s.getTime()) / 60000
    }, 0)

  // Use task estimates if no calendar events
  const totalWorkLoad = scheduledMins > 0
    ? scheduledMins
    : tasks.filter(t => t.deadline && new Date(t.deadline).toDateString() === todayStr)
        .reduce((s, t) => s + (t.estimated_minutes ?? 30), 0)

  const todayTasks = tasks.filter(t => t.deadline && new Date(t.deadline).toDateString() === todayStr)
  const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < now)
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const isOverloaded = totalWorkLoad > 420 // 7h+

  const nudges = computeNudges(tasks, totalWorkLoad)
  const todayOrder = computeTodayOrder(tasks)
  const isEmpty = tasks.length === 0 && projects.length === 0

  const S = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 1060, margin: '0 auto', ...S }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.03em', marginBottom: 4 }}>
          {greet()} 👋
        </h1>
        <p style={{ fontSize: 13, color: '#aaa' }}>
          {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          {isOverloaded && <span style={{ color: '#ea580c', fontWeight: 500, marginLeft: 12 }}>⚠ Heavy day ahead</span>}
        </p>
      </div>

      {/* ── Smart nudges ── */}
      {nudges.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22 }}>
          {nudges.map(nudge => (
            <div key={nudge.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 14px', borderRadius: 9,
              background: nudge.severity === 'high' ? '#fff5f5' : '#fdf8ee',
              border: `1px solid ${nudge.severity === 'high' ? '#fecaca' : '#e8d5a0'}`,
            }}>
              <AlertTriangle size={13} style={{ color: nudge.severity === 'high' ? '#dc2626' : '#c9a84c', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12.5, color: nudge.severity === 'high' ? '#7f1d1d' : '#7a5e1a', flex: 1, lineHeight: 1.5 }}>
                {nudge.message}
              </p>
              {nudge.taskId && (
                <Link href={`/dashboard/tasks/${nudge.taskId}`} style={{ fontSize: 11, color: '#2d7a4f', textDecoration: 'none', flexShrink: 0, fontWeight: 500 }}>
                  View →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Due today', value: todayTasks.length, color: '#c9a84c', bg: '#fdf8ee', border: '#e8d5a0' },
          { label: 'Overdue', value: overdueTasks.length, color: '#dc2626', bg: '#fff5f5', border: '#fecaca' },
          { label: 'In progress', value: inProgressTasks.length, color: '#2d7a4f', bg: '#f0faf4', border: '#c6e6d4' },
          { label: 'Projects', value: projects.length, color: '#2d7a4f', bg: '#f0faf4', border: '#c6e6d4' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '13px 16px' }}>
            <p style={{ fontSize: 11, color: '#aaa', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Empty state ── */}
      {isEmpty && (
        <div style={{ background: 'linear-gradient(135deg, #f0faf4, #fdf8ee)', border: '1px solid rgba(45,122,79,.12)', borderRadius: 12, padding: '24px 22px', display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#2d7a4f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>Start by adding your tasks</h3>
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 14 }}>
              Paste a brain dump, email, or notes. AI extracts everything into projects in seconds.
            </p>
            <Link href="/dashboard/extract" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#2d7a4f', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              <Sparkles size={13} />Add tasks with AI
            </Link>
          </div>
        </div>
      )}

      {/* ── Main grid ── */}
      {!isEmpty && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* TODAY'S FOCUS — Sprint 3: AI-powered with reasoning */}
          <div style={{ gridColumn: '1 / -1' }}>
            <TodayFocusPanel tasks={todayOrder} />
          </div>

          {/* All tasks column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>All upcoming</span>
              <Link href="/dashboard/tasks" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#2d7a4f', textDecoration: 'none', fontWeight: 500 }}>
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {tasks.slice(0, 7).map(task => (
                <Link key={task.id} href={`/dashboard/tasks/${task.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px',
                  borderRadius: 8, textDecoration: 'none',
                  background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: (task.project as any)?.colour ?? '#2d7a4f', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                  {task.deadline && <span style={{ fontSize: 10.5, color: deadlineColor(task.deadline), flexShrink: 0 }}>{fmtDeadline(task.deadline)}</span>}
                </Link>
              ))}
            </div>
          </div>

          {/* Projects column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Projects</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link href="/dashboard/mindmap" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#888', textDecoration: 'none' }}>
                  <GitFork size={11} />Map
                </Link>
                <Link href="/dashboard/projects" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: '#2d7a4f', textDecoration: 'none', fontWeight: 500 }}>
                  View all <ChevronRight size={12} />
                </Link>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {projects.slice(0, 6).map(p => (
                <Link key={p.id} href={`/dashboard/projects/${p.id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px',
                  borderRadius: 8, textDecoration: 'none',
                  background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{p.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.colour, flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ── Quick actions ── */}
      <div style={{ display: 'flex', gap: 8, marginTop: 28, flexWrap: 'wrap' }}>
        <Link href="/dashboard/extract" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: '#2d7a4f', color: '#fff', textDecoration: 'none' }}>
          <Sparkles size={13} />AI Extract
        </Link>
        <Link href="/dashboard/calendar" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: '#f0faf4', color: '#1f5537', border: '1px solid rgba(45,122,79,.2)', textDecoration: 'none' }}>
          <Calendar size={13} />Calendar
        </Link>
        <Link href="/dashboard/mindmap" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: '#f3f3f1', color: '#555', border: '1px solid rgba(0,0,0,.1)', textDecoration: 'none' }}>
          <GitFork size={13} />Mind map
        </Link>
        <Link href="/dashboard/insights" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: '#f3f3f1', color: '#555', border: '1px solid rgba(0,0,0,.1)', textDecoration: 'none' }}>
          <BarChart2 size={13} />Insights
        </Link>
      </div>

    </div>
  )
}
