'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Sparkles } from 'lucide-react'
import { cn, formatDeadline, deadlineColour, PRIORITY_COLOURS, STATUS_LABELS } from '@/lib/utils'
import type { Task } from '@/types'

const STATUSES = ['all','todo','in_progress','done','blocked'] as const

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<typeof STATUSES[number]>('all')

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const res = await fetch(filter === 'all' ? '/api/tasks' : `/api/tasks?status=${filter}`)
    setTasks(await res.json())
    setLoading(false)
  }, [filter])

  useEffect(()=>{ fetchTasks() },[fetchTasks])

  async function toggleDone(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    setTasks(prev=>prev.map(t=>t.id===task.id?{...t,status:newStatus}:t))
    await fetch(`/api/tasks/${task.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:newStatus})})
  }

  const grouped = tasks.reduce<Record<string,Task[]>>((acc,task)=>{
    const key=(task as any).project?.name ?? 'No project'
    if(!acc[key]) acc[key]=[]
    acc[key].push(task)
    return acc
  },{})

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 gold-underline" style={{fontFamily:'Georgia,serif'}}>All tasks</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/extract" className="flex items-center gap-1.5 text-sm text-[#2d7a4f] border border-[#2d7a4f]/30 px-3 py-1.5 rounded-lg hover:bg-[#e8f5ee] transition-colors">
            <Sparkles size={14}/>AI add
          </Link>
          <Link href="/dashboard/tasks/new" className="flex items-center gap-1.5 text-sm bg-[#2d7a4f] text-white px-3 py-1.5 rounded-lg hover:bg-[#1f5537] transition-colors">
            <Plus size={14}/>New task
          </Link>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {STATUSES.map(s=>(
          <button key={s} onClick={()=>setFilter(s)} className={cn('text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all', filter===s?'bg-white text-[#2d7a4f] shadow-sm':'text-gray-500 hover:text-gray-700')}>
            {s==='all'?'All':STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
      ) : tasks.length===0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm mb-4">No tasks yet</p>
          <Link href="/dashboard/extract" className="inline-flex items-center gap-2 text-sm text-[#2d7a4f] bg-[#e8f5ee] px-4 py-2 rounded-lg hover:bg-[#d0e8da] transition-colors">
            <Sparkles size={14}/>Add your first tasks with AI
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([projectName,projectTasks])=>(
            <div key={projectName}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{projectName}</h2>
              <div className="space-y-2">
                {projectTasks.map(task=>(
                  <div key={task.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-[#2d7a4f]/20 task-card group">
                    <input type="checkbox" className="task-check" checked={task.status==='done'} onChange={()=>toggleDone(task)}/>
                    <Link href={`/dashboard/tasks/${task.id}`} className="flex-1 flex items-center gap-3 min-w-0">
                      <span className={cn('text-sm flex-1 truncate',task.status==='done'&&'line-through text-gray-400')}>{task.title}</span>
                      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',PRIORITY_COLOURS[task.priority])}>{task.priority}</span>
                        {task.deadline&&<span className={cn('text-xs',deadlineColour(task.deadline))}>{formatDeadline(task.deadline)}</span>}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
