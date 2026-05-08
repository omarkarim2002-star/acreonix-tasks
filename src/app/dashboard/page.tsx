import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { Sparkles, ArrowRight, Clock, AlertCircle, ChevronRight } from 'lucide-react'
import { formatDeadline, deadlineColour } from '@/lib/utils'
import type { Project, Task } from '@/types'

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

function briefing(overdue: Task[], today: Task[], active: Task[]) {
  if (overdue.length > 0 && today.length > 0)
    return `${overdue.length} task${overdue.length>1?'s':''} overdue · ${today.length} due today`
  if (overdue.length > 0)
    return `${overdue.length} task${overdue.length>1?'s are':' is'} overdue — needs attention`
  if (today.length > 0)
    return `${today.length} task${today.length>1?'s':''} due today · you're on track`
  if (active.length > 0)
    return `${active.length} active task${active.length>1?'s':''} · nothing urgent today`
  return 'All clear — add tasks to get started'
}

export default async function DashboardPage() {
  const { userId } = await auth()

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabaseAdmin.from('projects').select('*').eq('user_id', userId!).eq('status','active').order('created_at',{ascending:false}).limit(6),
    supabaseAdmin.from('tasks').select('*, project:projects(name,colour)').eq('user_id',userId!).neq('status','done').order('deadline',{ascending:true,nullsFirst:false}).limit(15),
  ])

  const taskArr = (tasks as Task[]) ?? []
  const projArr = (projects as Project[]) ?? []

  const today   = taskArr.filter(t => t.deadline && new Date(t.deadline).toDateString() === new Date().toDateString())
  const overdue = taskArr.filter(t => t.deadline && new Date(t.deadline) < new Date())
  const focus   = taskArr.slice(0, 7)

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight mb-2" style={{ color:'#101312', letterSpacing:'-0.5px' }}>
          Good {getGreeting()}
        </h1>

        {/* AI briefing */}
        <div className="flex items-center gap-3 mt-4 p-3 rounded-xl" style={{ background:'#EAF4EF' }}>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:'#0D3D2E', color:'#D7F36A', letterSpacing:'0.5px' }}>
            ✦ AI
          </span>
          <p className="text-sm font-medium flex-1" style={{ color:'#0D3D2E' }}>
            {briefing(overdue, today, taskArr)}
          </p>
          <Link href="/dashboard/tasks" className="text-sm font-semibold" style={{ color:'#0D3D2E' }}>
            View tasks →
          </Link>
        </div>
      </div>

      {/* Stats row — borderless tonal */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label:'Due today', value:today.length,   color: today.length > 0 ? '#c9a84c' : '#9BA5A0'  },
          { label:'Overdue',   value:overdue.length,  color: overdue.length > 0 ? '#DC2626' : '#9BA5A0' },
          { label:'Active',    value:taskArr.length,  color:'#0D3D2E' },
          { label:'Projects',  value:projArr.length,  color:'#2563EB' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4 text-center" style={{ background:'#fff', boxShadow:'0 2px 8px rgba(16,19,18,0.06)' }}>
            <p className="text-3xl font-black mb-1" style={{ color:s.color, letterSpacing:'-0.5px' }}>{s.value}</p>
            <p className="text-xs" style={{ color:'#9BA5A0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">

        {/* Focus panel — hero, 3 cols */}
        <section className="col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color:'#101312' }}>Today's focus</h2>
            <Link href="/dashboard/tasks" className="text-sm font-semibold" style={{ color:'#0D3D2E' }}>
              All tasks →
            </Link>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background:'#fff', boxShadow:'0 4px 16px rgba(16,19,18,0.08)' }}>
            {focus.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color:'#9BA5A0' }}>
                All caught up — nothing urgent
              </div>
            ) : (
              focus.map((task, i) => {
                const proj   = (task as any).project
                const colour = proj?.colour ?? '#0D3D2E'
                const isOverdue = task.deadline && new Date(task.deadline) < new Date()
                return (
                  <Link
                    key={task.id}
                    href={`/dashboard/tasks/${task.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 task-row transition-colors"
                    style={{
                      borderLeft: `3px solid ${colour}`,
                      borderBottom: i < focus.length-1 ? '1px solid #F7F8F5' : 'none',
                    }}
                  >
                    {/* Priority ring */}
                    <div className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
                      style={{ borderColor: colour }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: isOverdue ? '#DC2626' : '#101312' }}>
                        {task.title}
                      </p>
                      {(proj || task.deadline) && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {proj && <span className="text-xs" style={{ color:'#9BA5A0' }}>{proj.name}</span>}
                          {task.deadline && (
                            <span className="text-xs font-medium" style={{ color: isOverdue ? '#DC2626' : '#9BA5A0' }}>
                              {isOverdue ? '⚠ ' : ''}{formatDeadline(task.deadline)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: colour }} />
                  </Link>
                )
              })
            )}
          </div>
        </section>

        {/* Projects + AI CTA — 2 cols */}
        <section className="col-span-2 flex flex-col gap-4">

          {/* AI plan card */}
          <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background:'#0D3D2E', boxShadow:'0 4px 14px rgba(13,61,46,0.22)' }}>
            <div className="flex-1">
              <p className="text-base font-bold text-white mb-1">Plan with AI</p>
              <p className="text-xs" style={{ color:'rgba(255,255,255,0.55)' }}>Schedule your tasks automatically</p>
            </div>
            <Link
              href="/dashboard/extract"
              className="flex items-center gap-1.5 text-sm font-black px-4 py-2 rounded-full shrink-0 transition-all"
              style={{ background:'#D7F36A', color:'#071F17' }}
            >
              ✦ Plan
            </Link>
          </div>

          {/* Projects list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold" style={{ color:'#101312' }}>Projects</h2>
              <Link href="/dashboard/projects" className="text-sm font-semibold" style={{ color:'#0D3D2E' }}>
                All →
              </Link>
            </div>
            <div className="space-y-2">
              {projArr.slice(0,4).map(proj => (
                <Link
                  key={proj.id}
                  href={`/dashboard/projects/${proj.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl card-hover"
                  style={{ background:'#fff', boxShadow:'0 1px 4px rgba(16,19,18,0.05)' }}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: proj.colour }} />
                  <span className="text-sm font-medium flex-1 truncate" style={{ color:'#101312' }}>{proj.name}</span>
                  <ChevronRight size={14} style={{ color:'#C8D0CC' }} />
                </Link>
              ))}
              {projArr.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color:'#9BA5A0' }}>No projects yet</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
