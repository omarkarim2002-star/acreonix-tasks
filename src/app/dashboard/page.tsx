import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { Sparkles, ArrowRight, Clock, AlertCircle, CheckCircle2, GitFork, Calendar } from 'lucide-react'
import { formatDeadline, deadlineColour } from '@/lib/utils'
import type { Task, Project } from '@/types'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) return null

  const [projectsRes, tasksRes, allTasksRes] = await Promise.all([
    supabaseAdmin.from('projects').select('*').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }).limit(6),
    supabaseAdmin.from('tasks').select('*, project:projects(name,colour,icon)').eq('user_id', userId).neq('status', 'done').order('deadline', { ascending: true, nullsFirst: false }).limit(8),
    supabaseAdmin.from('tasks').select('id,status,project_id').eq('user_id', userId),
  ])

  const projects = (projectsRes.data ?? []) as Project[]
  const tasks = (tasksRes.data ?? []) as Task[]
  const allTasks = allTasksRes.data ?? []

  const now = new Date()
  const todayTasks = tasks.filter(t => t.deadline && new Date(t.deadline).toDateString() === now.toDateString())
  const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < now)
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const projectsWithStats = projects.map(p => ({
    ...p,
    total: allTasks.filter(t => t.project_id === p.id).length,
    done: allTasks.filter(t => t.project_id === p.id && t.status === 'done').length,
  }))

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      <div className="mb-8 fade-up fade-up-1">
        <h1 className="serif-heading gold-line text-3xl mb-1">{greeting}</h1>
        <p className="text-sm mt-4" style={{ color: '#9aa3b4' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5 mb-8 fade-up fade-up-2">
        <Link href="/dashboard/calendar"
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border-2 transition-all hover:shadow-sm"
          style={{ borderColor: '#2d7a4f', color: '#2d7a4f', background: '#fff' }}>
          <Calendar size={14} />Schedule my day
        </Link>
        <Link href="/dashboard/mindmap"
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg border transition-all hover:shadow-sm"
          style={{ borderColor: '#e8edf2', color: '#5a6478', background: '#fff' }}>
          <GitFork size={14} />All projects map
        </Link>
        <Link href="/dashboard/extract"
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg text-white transition-all hover:opacity-90 ml-auto"
          style={{ background: '#2d7a4f' }}>
          <Sparkles size={14} />Add tasks with AI
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8 fade-up fade-up-2">
        {[
          { label: 'Due today', value: todayTasks.length, bg: '#faf5e8', icon: Clock, iconCol: '#c9a84c' },
          { label: 'Overdue', value: overdueTasks.length, bg: '#fef2f2', icon: AlertCircle, iconCol: '#dc2626' },
          { label: 'In progress', value: inProgressTasks.length, bg: '#e8f4ee', icon: CheckCircle2, iconCol: '#2d7a4f' },
        ].map(({ label, value, bg, icon: Icon, iconCol }) => (
          <div key={label} className="rounded-xl px-5 py-4" style={{ background: bg }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={13} style={{ color: iconCol }} />
              <span className="text-xs font-medium" style={{ color: '#9aa3b4' }}>{label}</span>
            </div>
            <p className="text-2xl font-semibold serif-heading" style={{ color: '#141b2d' }}>{value}</p>
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="mb-8 rounded-xl p-6 fade-up fade-up-3" style={{ background: 'linear-gradient(135deg, #e8f4ee 0%, #faf5e8 100%)', border: '1px solid #d4e8db' }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#2d7a4f' }}>
              <Sparkles size={17} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: '#141b2d' }}>Start by adding your tasks</h2>
              <p className="text-sm mb-4" style={{ color: '#5a6478' }}>Paste anything — notes, emails, a brain dump. AI structures everything into projects and tasks.</p>
              <Link href="/dashboard/extract" className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg text-white" style={{ background: '#2d7a4f' }}>
                <Sparkles size={13} />Add tasks with AI
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 fade-up fade-up-3">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9aa3b4', letterSpacing: '0.08em' }}>Upcoming tasks</h2>
            <Link href="/dashboard/tasks" className="flex items-center gap-1 text-xs font-medium" style={{ color: '#2d7a4f' }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-1.5">
            {tasks.slice(0, 6).map(task => (
              <Link key={task.id} href={`/dashboard/tasks/${task.id}`} className="task-row flex items-center gap-3 px-4 py-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: (task as any).project?.colour ?? '#2d7a4f' }} />
                <span className="text-sm flex-1 truncate" style={{ color: '#2d3748' }}>{task.title}</span>
                {task.deadline && <span className={`text-xs shrink-0 ${deadlineColour(task.deadline)}`}>{formatDeadline(task.deadline)}</span>}
              </Link>
            ))}
            {tasks.length === 0 && <p className="text-sm py-4 text-center" style={{ color: '#9aa3b4' }}>No pending tasks</p>}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9aa3b4', letterSpacing: '0.08em' }}>Projects</h2>
            <Link href="/dashboard/projects" className="flex items-center gap-1 text-xs font-medium" style={{ color: '#2d7a4f' }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-1.5">
            {projectsWithStats.map(p => {
              const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
              return (
                <div key={p.id} className="task-row overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/dashboard/projects/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: p.colour + '1a' }}>
                        {p.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: '#2d3748' }}>{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: '#e8edf2' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.colour }} />
                          </div>
                          <span className="text-[10px] shrink-0" style={{ color: '#9aa3b4' }}>{pct}%</span>
                        </div>
                      </div>
                    </Link>
                    <Link href={`/dashboard/projects/${p.id}/mindmap`} className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md text-gray-400 hover:text-[#2d7a4f] hover:bg-[#e8f4ee] transition-colors shrink-0">
                      <GitFork size={10} />map
                    </Link>
                  </div>
                </div>
              )
            })}
            {projects.length === 0 && <p className="text-sm py-4 text-center" style={{ color: '#9aa3b4' }}>No projects yet</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
