import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { Sparkles, ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { formatDeadline, deadlineColour, STATUS_LABELS } from '@/lib/utils'
import type { Project, Task } from '@/types'

export default async function DashboardPage() {
  const { userId } = await auth()
  const user = await currentUser()
  const firstName = user?.firstName ?? ''

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabaseAdmin
      .from('projects')
      .select('*')
      .eq('user_id', userId!)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(6),
    supabaseAdmin
      .from('tasks')
      .select('*, project:projects(name, colour)')
      .eq('user_id', userId!)
      .neq('status', 'done')
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(10),
  ])

  const todayTasks = (tasks as Task[])?.filter((t) => {
    if (!t.deadline) return false
    const d = new Date(t.deadline)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  }) ?? []

  const overdueTasks = (tasks as Task[])?.filter((t) => {
    if (!t.deadline) return false
    return new Date(t.deadline) < new Date() && t.status !== 'done'
  }) ?? []

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 gold-underline" style={{ fontFamily: 'Georgia, serif' }}>
          Good {getTimeOfDay()}
        </h1>
        <p className="text-gray-500 text-sm mt-3">Here's your day at a glance.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Due today"
          value={todayTasks.length}
          icon={<Clock size={16} className="text-[#c9a84c]" />}
          colour="gold"
        />
        <StatCard
          label="Overdue"
          value={overdueTasks.length}
          icon={<AlertCircle size={16} className="text-red-500" />}
          colour="red"
        />
        <StatCard
          label="Active projects"
          value={(projects as Project[])?.length ?? 0}
          icon={<CheckCircle2 size={16} className="text-[#2d7a4f]" />}
          colour="green"
        />
      </div>

      {/* AI extract CTA — shown when no tasks exist */}
      {(!tasks || tasks.length === 0) && (
        <div className="mb-8 bg-gradient-to-br from-[#e8f5ee] to-[#faf5e8] rounded-2xl p-6 border border-[#d0e8da]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#2d7a4f] rounded-xl flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900 mb-1">Start by adding your tasks</h2>
              <p className="text-sm text-gray-600 mb-4">
                Paste anything — a list, random notes, a brain dump. AI will structure it into projects and tasks for you.
              </p>
              <Link
                href="/dashboard/extract"
                className="inline-flex items-center gap-2 bg-[#2d7a4f] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1f5537] transition-colors"
              >
                <Sparkles size={14} />
                Add tasks with AI
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming tasks */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Upcoming tasks</h2>
            <Link href="/dashboard/tasks" className="text-xs text-[#2d7a4f] hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {(tasks as Task[])?.slice(0, 6).map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
            {(!tasks || tasks.length === 0) && (
              <p className="text-sm text-gray-400 py-4 text-center">No pending tasks</p>
            )}
          </div>
        </section>

        {/* Projects */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Projects</h2>
            <Link href="/dashboard/projects" className="text-xs text-[#2d7a4f] hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {(projects as Project[])?.map((project) => (
              <ProjectRow key={project.id} project={project} />
            ))}
            {(!projects || projects.length === 0) && (
              <p className="text-sm text-gray-400 py-4 text-center">No projects yet</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function StatCard({
  label, value, icon, colour,
}: {
  label: string; value: number; icon: React.ReactNode; colour: 'green' | 'gold' | 'red'
}) {
  const bg = { green: 'bg-[#e8f5ee]', gold: 'bg-[#faf5e8]', red: 'bg-red-50' }[colour]
  return (
    <div className={`${bg} rounded-xl px-4 py-3`}>
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function TaskRow({ task }: { task: Task & { project?: { name: string; colour: string } } }) {
  return (
    <Link
      href={`/dashboard/tasks/${task.id}`}
      className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-[#2d7a4f]/30 hover:shadow-sm transition-all task-card"
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: task.project?.colour ?? '#2d7a4f' }}
      />
      <span className="text-sm text-gray-800 flex-1 truncate">{task.title}</span>
      {task.deadline && (
        <span className={`text-xs shrink-0 ${deadlineColour(task.deadline)}`}>
          {formatDeadline(task.deadline)}
        </span>
      )}
    </Link>
  )
}

function ProjectRow({ project }: { project: Project }) {
  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-[#2d7a4f]/30 hover:shadow-sm transition-all task-card"
    >
      <span className="text-lg">{project.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{project.name}</p>
        {project.description && (
          <p className="text-xs text-gray-400 truncate">{project.description}</p>
        )}
      </div>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: project.colour }} />
    </Link>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
