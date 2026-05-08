'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Search, ChevronRight, Check, Clock } from 'lucide-react'
import { cn, formatDeadline } from '@/lib/utils'
import type { Task } from '@/types'

const FILTERS = [
  { key:'all',         label:'All' },
  { key:'todo',        label:'To do' },
  { key:'in_progress', label:'Active' },
  { key:'blocked',     label:'Blocked' },
]

const STATUS_LABEL: Record<string,string> = {
  todo:'To do', in_progress:'In progress', blocked:'Blocked', done:'Done'
}

const PRIORITY_COLOR: Record<string,string> = {
  urgent:'#DC2626', high:'#EA580C', medium:'#2563EB', low:'#9BA5A0'
}

export default function TasksPage() {
  const [tasks,     setTasks]     = useState<Task[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')
  const [completing,setCompleting]= useState<string|null>(null)

  const load = useCallback(async () => {
    const url = filter === 'all' ? '/api/tasks' : `/api/tasks?status=${filter}`
    const res  = await fetch(url)
    setTasks(await res.json())
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function complete(task: Task) {
    setCompleting(task.id)
    setTasks(prev => prev.filter(t => t.id !== task.id))
    await fetch(`/api/tasks/${task.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ status:'done' }),
    })
    setCompleting(null)
  }

  // Group by project
  const filtered = tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
  const groups   = filtered.reduce<Record<string, { colour:string; tasks:Task[] }>>((acc, task) => {
    const proj   = (task as any).project
    const key    = proj?.name ?? 'No project'
    const colour = proj?.colour ?? '#0D3D2E'
    if (!acc[key]) acc[key] = { colour, tasks:[] }
    acc[key].tasks.push(task)
    return acc
  }, {})

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color:'#101312', letterSpacing:'-0.5px' }}>Tasks</h1>
          {!loading && <p className="text-sm mt-1" style={{ color:'#9BA5A0' }}>{tasks.length} active</p>}
        </div>
        <Link
          href="/dashboard/tasks/new"
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-full transition-all"
          style={{ background:'#0D3D2E', color:'#fff', boxShadow:'0 4px 12px rgba(13,61,46,0.22)' }}
        >
          <Plus size={15} /> New task
        </Link>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-xl" style={{ background:'#fff', boxShadow:'0 1px 4px rgba(16,19,18,0.06)' }}>
          <Search size={15} style={{ color:'#9BA5A0' }} />
          <input
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color:'#101312' }}
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: filter===f.key ? '#EAF4EF' : '#fff',
                color:      filter===f.key ? '#0D3D2E' : '#9BA5A0',
                boxShadow:  '0 1px 3px rgba(16,19,18,0.05)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs mb-4" style={{ color:'#C8D0CC' }}>Hover task to complete or edit</p>

      {/* Grouped task list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background:'#EEEEE8' }} />
          ))}
        </div>
      ) : Object.keys(groups).length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg font-semibold mb-2" style={{ color:'#66706B' }}>
            {search ? `No results for "${search}"` : 'All caught up'}
          </p>
          <p className="text-sm" style={{ color:'#9BA5A0' }}>
            {search ? 'Try a different search' : 'Add tasks from the AI Extract tab'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([groupName, group]) => (
            <div key={groupName}>
              {/* Section header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background:group.colour }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color:group.colour }}>
                  {groupName}
                </span>
                <span className="text-xs" style={{ color:'#C8D0CC' }}>{group.tasks.length}</span>
              </div>

              {/* Task rows */}
              <div className="rounded-2xl overflow-hidden" style={{ background:'#fff', boxShadow:'0 2px 8px rgba(16,19,18,0.06)' }}>
                {group.tasks.map((task, i) => {
                  const isOverdue = task.deadline && new Date(task.deadline) < new Date()
                  return (
                    <div
                      key={task.id}
                      className="group flex items-center gap-3 px-4 py-3.5 task-row transition-colors relative"
                      style={{
                        borderLeft: `3px solid ${group.colour}`,
                        borderBottom: i < group.tasks.length-1 ? '1px solid #F7F8F5' : 'none',
                      }}
                    >
                      {/* Complete button */}
                      <button
                        onClick={() => complete(task)}
                        className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-all"
                        style={{ borderColor:group.colour }}
                        title="Complete task"
                      >
                        {completing === task.id && (
                          <Check size={10} style={{ color:group.colour }} />
                        )}
                      </button>

                      {/* Priority dot — visible when not hovering */}
                      <div
                        className="w-2 h-2 rounded-full shrink-0 group-hover:hidden"
                        style={{ background: PRIORITY_COLOR[task.priority] ?? '#9BA5A0' }}
                      />

                      <div className="flex-1 min-w-0">
                        <Link href={`/dashboard/tasks/${task.id}`} className="block">
                          <p className="text-sm font-medium truncate" style={{ color: isOverdue ? '#DC2626' : '#101312' }}>
                            {task.title}
                          </p>
                          {task.deadline && (
                            <p className="text-xs mt-0.5" style={{ color: isOverdue ? '#DC2626' : '#9BA5A0' }}>
                              {isOverdue ? '⚠ ' : ''}{formatDeadline(task.deadline)}
                            </p>
                          )}
                        </Link>
                      </div>

                      {/* Logged time pill */}
                      {(task as any).logged_minutes > 0 && (
                        <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: '#EAF4EF', color: '#0D3D2E' }}>
                          <Clock size={11} />
                          <span className="font-bold tabular-nums">
                            {(task as any).logged_minutes >= 60
                              ? `${Math.floor((task as any).logged_minutes / 60)}h ${(task as any).logged_minutes % 60}m`
                              : `${(task as any).logged_minutes}m`}
                          </span>
                        </div>
                      )}

                      {/* Status badge */}
                      <span className="text-xs px-2 py-0.5 rounded-full hidden group-hover:block"
                        style={{ background:group.colour+'18', color:group.colour }}>
                        {STATUS_LABEL[task.status]}
                      </span>

                      <Link href={`/dashboard/tasks/${task.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={15} style={{ color:'#C8D0CC' }} />
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
