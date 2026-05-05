import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import {
  Sparkles, ArrowRight, AlertCircle, Clock,
  TrendingUp, Zap, CheckCircle2, GitFork,
  Calendar, BarChart2, ChevronRight, AlertTriangle,
} from 'lucide-react'
import { TodayFocusPanel } from '@/components/ui/TodayFocusPanel'
import { NudgePanel } from '@/components/ui/NudgePanel'

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
type Nudge = { id: string; type: 'deadline_risk' | 'stale' | 'overdue' | 'overload' | 'reschedule'; message: string; taskId?: string; projectId?: string; severity: 'high' | 'medium'; actionLabel?: string; actionHref?: string }

function computeNudges(
  tasks: Task[],
  totalScheduledMins: number,
  missedEvents: { task_id: string; title: string }[] = []
): Nudge[] {
  const nudges: Nudge[] = []
  const now = Date.now()
  const startOfToday = new Date(); startOfToday.setHours(0,0,0,0)

  // ── CRITICAL: Overdue tasks (already past deadline) ──────────────────────
  const overdue = tasks.filter(t =>
    t.deadline && new Date(t.deadline) < startOfToday && t.status !== 'done'
  )
  if (overdue.length === 1) {
    nudges.push({
      id: `overdue-${overdue[0].id}`,
      type: 'overdue', severity: 'high',
      message: `"${overdue[0].title}" is overdue — needs attention today.`,
      taskId: overdue[0].id,
      actionLabel: 'Open →',
      actionHref: `/dashboard/tasks/${overdue[0].id}`,
    })
  } else if (overdue.length > 1) {
    nudges.push({
      id: 'overdue-many',
      type: 'overdue', severity: 'high',
      message: `${overdue.length} tasks are overdue — oldest: "${overdue[0].title}".`,
      actionLabel: 'View tasks →',
      actionHref: '/dashboard/tasks',
    })
  }

  // ── HIGH: Urgent tasks due TODAY not started ──────────────────────────────
  const urgentToday = tasks.filter(t => {
    if (!t.deadline || t.status !== 'todo') return false
    const diff = Math.ceil((new Date(t.deadline).getTime() - now) / 86400000)
    return diff === 0 && (t.priority === 'urgent' || t.priority === 'high')
  })
  for (const task of urgentToday.slice(0, 1)) {
    nudges.push({
      id: `today-${task.id}`,
      type: 'deadline_risk', severity: 'high',
      message: `"${task.title}" is due today and hasn't been started.`,
      taskId: task.id,
      actionLabel: 'Start now →',
      actionHref: `/dashboard/tasks/${task.id}`,
    })
  }

  // ── HIGH: Overload ────────────────────────────────────────────────────────
  if (totalScheduledMins > 480) { // 8h+, not 7h
    nudges.push({
      id: 'overload',
      type: 'overload', severity: 'high',
      message: `${Math.round(totalScheduledMins / 60)}h scheduled today — that's a lot. Consider moving lower-priority tasks.`,
      actionLabel: 'View calendar →',
      actionHref: '/dashboard/calendar',
    })
  }

  // ── MEDIUM: Reschedule nudges (missed yesterday) ──────────────────────────
  const pendingIds = new Set(tasks.map(t => t.id))
  const seenMissed = new Set<string>()
  for (const ev of missedEvents) {
    if (!ev.task_id || seenMissed.has(ev.task_id) || !pendingIds.has(ev.task_id)) continue
    seenMissed.add(ev.task_id)
    nudges.push({
      id: `reschedule-${ev.task_id}`,
      type: 'reschedule', severity: 'medium',
      message: `"${ev.title}" was scheduled yesterday but wasn't completed.`,
      taskId: ev.task_id,
      actionLabel: 'Reschedule →',
      actionHref: `/dashboard/tasks/${ev.task_id}`,
    })
    if (nudges.filter(n => n.type === 'reschedule').length >= 2) break
  }

  // ── MEDIUM: Stale tasks (7+ days, not 5) ─────────────────────────────────
  // Only surface if no other higher-priority nudges dominate
  if (nudges.length < 3) {
    const stale = tasks.filter(t =>
      t.priority !== 'low' &&
      t.status !== 'done' &&
      daysSinceUpdated(t.updated_at) >= 7
    )
    if (stale.length > 0) {
      nudges.push({
        id: `stale-${stale[0].id}`,
        type: 'stale', severity: 'medium',
        message: `"${stale[0].title}" hasn't moved in ${daysSinceUpdated(stale[0].updated_at)} days${stale.length > 1 ? ` (+${stale.length - 1} more)` : ''}.`,
        taskId: stale[0].id,
        actionLabel: 'Review →',
        actionHref: `/dashboard/tasks/${stale[0].id}`,
      })
    }
  }

  // Sort: critical first, then cap at 5 total (collapsible handles the rest)
  const priority = { overdue: 4, deadline_risk: 3, overload: 2, reschedule: 1, stale: 0 }
  return nudges
    .sort((a, b) => (priority[b.type as keyof typeof priority] ?? 0) - (priority[a.type as keyof typeof priority] ?? 0))
    .slice(0, 5)
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

  // Get user's first name for personalised greeting
  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)
  const firstName = clerkUser.firstName ?? ''

  const now = new Date()
  const todayStr = now.toDateString()
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999)

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
      .gte('start_time', startOfDay.toISOString())
      .lte('end_time', endOfDay.toISOString()),
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

  const todayTasks = tasks.filter(t => {
    if (!t.deadline) return false
    const d = new Date(t.deadline)
    // Compare date parts only (ignore time) to handle UTC vs local timezone
    return d.getUTCFullYear() === now.getFullYear() &&
           d.getUTCMonth() === now.getMonth() &&
           d.getUTCDate() === now.getDate()
  })
  const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < startOfDay)
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const isOverloaded = totalWorkLoad > 420 // 7h+

  const nudges = computeNudges(tasks, totalWorkLoad)
  const todayOrder = computeTodayOrder(tasks)
  const isEmpty = tasks.length === 0 && projects.length === 0

  const S = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ padding: 'clamp(14px, 4vw, 28px) clamp(14px, 4vw, 32px) 60px', maxWidth: 1060, margin: '0 auto', ...S }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 'clamp(18px, 5vw, 24px)', fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.03em', marginBottom: 4 }}>
          {greet()}{firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <p style={{ fontSize: 13, color: '#aaa' }}>
          {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          {isOverloaded && <span style={{ color: '#ea580c', fontWeight: 500, marginLeft: 12 }}>⚠ Heavy day ahead</span>}
        </p>
        {/* Quick links */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <Link href="/dashboard/extract" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: 'clamp(6px,1.5vw,7px) clamp(10px,3vw,14px)', borderRadius: 8, fontSize: 'clamp(11px,3vw,12.5px)', fontWeight: 600, background: '#2d7a4f', color: '#fff', textDecoration: 'none', boxShadow: '0 2px 6px rgba(45,122,79,0.2)' }}>
            <Sparkles size={12} />AI Extract
          </Link>
          <Link href="/dashboard/calendar" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: '#f0faf4', color: '#1f5537', border: '1px solid rgba(45,122,79,.2)', textDecoration: 'none' }}>
            <Calendar size={12} />Calendar
          </Link>
          <Link href="/dashboard/mindmap" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: '#f3f3f1', color: '#555', border: '1px solid rgba(0,0,0,.1)', textDecoration: 'none' }}>
            <GitFork size={12} />Mind map
          </Link>
          <Link href="/dashboard/insights" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: '#f3f3f1', color: '#555', border: '1px solid rgba(0,0,0,.1)', textDecoration: 'none' }}>
            <BarChart2 size={12} />Insights
          </Link>
        </div>
      </div>

      {/* ── Smart nudges ── */}
            <NudgePanel nudges={nudges} />

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Due today', value: todayTasks.length, color: '#c9a84c', bg: '#fdf8ee', border: '#e8d5a0', href: '/dashboard/tasks?filter=today' },
          { label: 'Overdue', value: overdueTasks.length, color: '#dc2626', bg: '#fff5f5', border: '#fecaca', href: '/dashboard/tasks?filter=overdue' },
          { label: 'In progress', value: inProgressTasks.length, color: '#2d7a4f', bg: '#f0faf4', border: '#c6e6d4', href: '/dashboard/tasks?filter=in_progress' },
          { label: 'Projects', value: projects.length, color: '#2d7a4f', bg: '#f0faf4', border: '#c6e6d4', href: '/dashboard/projects' },
        ].map(({ label, value, color, bg, border, href }) => (
          <Link key={label} href={href} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: 'clamp(10px,2.5vw,13px) clamp(12px,3vw,16px)', textDecoration: 'none', display: 'block' }}>
            <p style={{ fontSize: 11, color: '#aaa', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</p>
          </Link>
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


    </div>
  )
}
