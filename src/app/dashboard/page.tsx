import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { Sparkles, ArrowRight, Clock, AlertCircle, CheckCircle2, GitFork } from 'lucide-react'
import { formatDeadline, deadlineColour } from '@/lib/utils'
import type { Task, Project } from '@/types'

export default async function DashboardPage() {
  const { userId } = await auth()

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabaseAdmin.from('projects').select('*, tasks(id,status)').eq('user_id', userId!).eq('status', 'active').order('created_at', { ascending: false }).limit(6),
    supabaseAdmin.from('tasks').select('*, project:projects(name,colour,icon)').eq('user_id', userId!).neq('status', 'done').order('deadline', { ascending: true, nullsFirst: false }).limit(8),
  ])

  const now = new Date()
  const todayTasks = (tasks as Task[])?.filter(t => {
    if (!t.deadline) return false
    const d = new Date(t.deadline)
    return d.toDateString() === now.toDateString()
  }) ?? []

  const overdueTasks = (tasks as Task[])?.filter(t => {
    if (!t.deadline) return false
    return new Date(t.deadline) < now
  }) ?? []

  const inProgressTasks = (tasks as Task[])?.filter(t => t.status === 'in_progress') ?? []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 gold-underline" style={{ fontFamily: 'Georgia, serif' }}>
          {greeting}
        </h1>
        <p className="text-gray-400 text-sm mt-3">Here's your day at a glance.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-[#faf5e8] rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={14} className="text-[#c9a84c]" />
            <span className="text-xs text-gray-500">Due today</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{todayTasks.length}</p>
        </div>
        <div className="bg-red-50 rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-xs text-gray-500">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{overdueTasks.length}</p>
        </div>
        <div className="bg-[#e8f5ee] rounded-xl px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 size={14} className="text-[#2d7a4f]" />
            <span className="text-xs text-gray-500">In progress</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{inProgressTasks.length}</p>
        </div>
      </div>

      {/* AI CTA if empty */}
      {(!tasks || tasks.length === 0) && (
        <div className="mb-8 bg-gradient-to-br from-[#e8f5ee] to-[#faf5e8] rounded-2xl p-6 border border-[#d0e8da]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#2d7a4f] rounded-xl flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Start by adding your tasks</h2>
              <p className="text-sm text-gray-600 mb-4">Paste anything — a list, random notes, a brain dump. AI will structure it into projects and tasks for you.</p>
              <Link href="/dashboard/extract" className="inline-flex items-center gap-2 bg-[#2d7a4f] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1f5537] transition-colors">
                <Sparkles size={14} />Add tasks with AI
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming tasks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Upcoming tasks</h2>
            <Link href="/dashboard/tasks" className="text-xs text-[#2d7a4f] hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-1.5">
            {(tasks as Task[])?.slice(0, 6).map(task => (
              <Link
                key={task.id}
                href={`/dashboard/tasks/${task.id}`}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-[#2d7a4f]/30 task-card group"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: (task as any).project?.colour ?? '#2d7a4f' }} />
                <span className="text-sm text-gray-800 flex-1 truncate">{task.title}</span>
                {task.deadline && (
                  <span className={`text-xs shrink-0 ${deadlineColour(task.deadline)}`}>
                    {formatDeadline(task.deadline)}
                  </span>
                )}
              </Link>
            ))}
            {(!tasks || tasks.length === 0) && (
              <p className="text-sm text-gray-400 py-4 text-center">No pending tasks</p>
            )}
          </div>
        </section>

        {/* Projects */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Projects</h2>
            <Link href="/dashboard/projects" className="text-xs text-[#2d7a4f] hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-1.5">
            {(projects as (Project & { tasks: { id: string; status: string }[] })[])?.map(p => {
              const total = p.tasks?.length ?? 0
              const done = p.tasks?.filter(t => t.status === 'done').length ?? 0
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              return (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 task-card overflow-hidden">
                  <Link href={`/dashboard/projects/${p.id}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: p.colour + '22' }}>
                      {p.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.colour }} />
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{pct}%</span>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/projects/${p.id}/mindmap`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#2d7a4f] px-2 py-1 rounded hover:bg-[#e8f5ee] transition-colors shrink-0"
                    >
                      <GitFork size={10} />map
                    </Link>
                  </Link>
                </div>
              )
            })}
            {(!projects || projects.length === 0) && (
              <p className="text-sm text-gray-400 py-4 text-center">No projects yet</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
