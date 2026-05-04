import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { formatDeadline, deadlineColour } from '@/lib/utils'
import type { Task, Project } from '@/types'

export default async function DashboardPage() {
  const { userId } = await auth()

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabaseAdmin.from('projects').select('*').eq('user_id', userId!).eq('status','active').order('created_at',{ascending:false}).limit(6),
    supabaseAdmin.from('tasks').select('*, project:projects(name,colour)').eq('user_id', userId!).neq('status','done').order('deadline',{ascending:true,nullsFirst:false}).limit(8),
  ])

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 gold-underline" style={{fontFamily:'Georgia,serif'}}>Dashboard</h1>
      </div>

      {(!tasks || tasks.length === 0) && (
        <div className="mb-8 bg-gradient-to-br from-[#e8f5ee] to-[#faf5e8] rounded-2xl p-6 border border-[#d0e8da]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#2d7a4f] rounded-xl flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Add your first tasks</h2>
              <p className="text-sm text-gray-600 mb-4">Paste anything — notes, emails, brain dumps. AI structures it for you.</p>
              <Link href="/dashboard/extract" className="inline-flex items-center gap-2 bg-[#2d7a4f] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1f5537] transition-colors">
                <Sparkles size={14} />Add tasks with AI
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Upcoming tasks</h2>
            <Link href="/dashboard/tasks" className="text-xs text-[#2d7a4f] hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-2">
            {(tasks as Task[])?.map((task) => (
              <Link key={task.id} href={`/dashboard/tasks/${task.id}`} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-[#2d7a4f]/30 task-card">
                <div className="w-2 h-2 rounded-full shrink-0" style={{background:(task as any).project?.colour ?? '#2d7a4f'}} />
                <span className="text-sm text-gray-800 flex-1 truncate">{task.title}</span>
                {task.deadline && <span className={`text-xs shrink-0 ${deadlineColour(task.deadline)}`}>{formatDeadline(task.deadline)}</span>}
              </Link>
            ))}
            {(!tasks || tasks.length === 0) && <p className="text-sm text-gray-400 py-4 text-center">No pending tasks</p>}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Projects</h2>
            <Link href="/dashboard/projects" className="text-xs text-[#2d7a4f] hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-2">
            {(projects as Project[])?.map((p) => (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-[#2d7a4f]/30 task-card">
                <span className="text-lg">{p.icon}</span>
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">{p.name}</span>
                <div className="w-2 h-2 rounded-full shrink-0" style={{background:p.colour}} />
              </Link>
            ))}
            {(!projects || projects.length === 0) && <p className="text-sm text-gray-400 py-4 text-center">No projects yet</p>}
          </div>
        </section>
      </div>
    </div>
  )
}
