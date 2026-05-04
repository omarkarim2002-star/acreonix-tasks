'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Sparkles, Loader2, Pencil, Check, X } from 'lucide-react'
import { cn, formatDeadline, deadlineColour, PRIORITY_COLOURS, STATUS_LABELS } from '@/lib/utils'
import type { Project, Task } from '@/types'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project|null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(()=>{
    Promise.all([fetch(`/api/projects/${id}`).then(r=>r.json()),fetch(`/api/tasks?project_id=${id}`).then(r=>r.json())]).then(([proj,t])=>{
      setProject(proj);setNameValue(proj.name);setTasks(t);setLoading(false)
    })
  },[id])

  async function saveName() {
    if(!project||!nameValue.trim()) return
    await fetch(`/api/projects/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nameValue})})
    setProject(prev=>prev?{...prev,name:nameValue}:prev);setEditingName(false)
  }

  async function toggleTask(task:Task) {
    const s=task.status==='done'?'todo':'done'
    setTasks(prev=>prev.map(t=>t.id===task.id?{...t,status:s}:t))
    await fetch(`/api/tasks/${task.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:s})})
  }

  const filtered=statusFilter==='all'?tasks:tasks.filter(t=>t.status===statusFilter)
  const done=tasks.filter(t=>t.status==='done').length
  const pct=tasks.length>0?Math.round((done/tasks.length)*100):0

  if(loading) return <div className="flex items-center justify-center h-64"><Loader2 size={20} className="animate-spin text-gray-300"/></div>
  if(!project) return null

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <button onClick={()=>router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"><ArrowLeft size={14}/>Projects</button>
      <div className="bg-white rounded-2xl border border-gray-200 px-6 py-5 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{project.icon}</span>
          <div className="flex-1">
            {editingName?(
              <div className="flex items-center gap-2">
                <input autoFocus value={nameValue} onChange={e=>setNameValue(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveName()} className="text-xl font-bold text-gray-900 focus:outline-none border-b-2 border-[#2d7a4f] flex-1"/>
                <button onClick={saveName} className="text-[#2d7a4f]"><Check size={16}/></button>
                <button onClick={()=>setEditingName(false)} className="text-gray-400"><X size={16}/></button>
              </div>
            ):(
              <button onClick={()=>setEditingName(true)} className="group flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900" style={{fontFamily:'Georgia,serif'}}>{project.name}</h1>
                <Pencil size={14} className="text-gray-300 group-hover:text-gray-500"/>
              </button>
            )}
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
          <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:project.colour}}/>
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{done} of {tasks.length} tasks done</span><span>{pct}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {(['all','todo','in_progress','done','blocked']).map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)} className={cn('text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap transition-all',statusFilter===s?'bg-white text-[#2d7a4f] shadow-sm':'text-gray-500 hover:text-gray-700')}>
              {s==='all'?'All':STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/extract" className="flex items-center gap-1 text-xs text-[#2d7a4f] border border-[#2d7a4f]/30 px-2.5 py-1.5 rounded-lg hover:bg-[#e8f5ee]"><Sparkles size={12}/>AI</Link>
          <Link href="/dashboard/tasks/new" className="flex items-center gap-1 text-xs bg-[#2d7a4f] text-white px-2.5 py-1.5 rounded-lg hover:bg-[#1f5537]"><Plus size={12}/>New</Link>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length===0&&<p className="text-center text-sm text-gray-400 py-8">No tasks</p>}
        {filtered.map(task=>(
          <div key={task.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 hover:border-[#2d7a4f]/20 task-card group">
            <input type="checkbox" className="task-check" checked={task.status==='done'} onChange={()=>toggleTask(task)}/>
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
  )
}
