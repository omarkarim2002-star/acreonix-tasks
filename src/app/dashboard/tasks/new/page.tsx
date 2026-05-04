'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { Project } from '@/types'

export default function NewTaskPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({title:'',description:'',project_id:'',priority:'medium',deadline:'',estimated_minutes:''})

  useEffect(()=>{ fetch('/api/projects').then(r=>r.json()).then(setProjects) },[])

  function update(field:string,value:string){setForm(prev=>({...prev,[field]:value}))}

  async function submit() {
    if(!form.title.trim()) return
    setLoading(true)
    const res = await fetch('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,project_id:form.project_id||null,deadline:form.deadline?`${form.deadline}T00:00:00Z`:null,estimated_minutes:form.estimated_minutes?parseInt(form.estimated_minutes):null})})
    const task = await res.json()
    router.push(`/dashboard/tasks/${task.id}`)
  }

  return (
    <div className="px-6 py-8 max-w-xl mx-auto">
      <button onClick={()=>router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"><ArrowLeft size={14}/>Back</button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{fontFamily:'Georgia,serif'}}>New task</h1>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Task title *</label>
            <input autoFocus type="text" value={form.title} onChange={e=>update('title',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="What needs to be done?" className="w-full text-base border border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-[#2d7a4f]"/>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Project</label>
            <select value={form.project_id} onChange={e=>update('project_id',e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2d7a4f]">
              <option value="">No project</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Priority</label>
              <select value={form.priority} onChange={e=>update('priority',e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2d7a4f]">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-2">Deadline</label>
              <input type="date" value={form.deadline} onChange={e=>update('deadline',e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2d7a4f]"/>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Estimate (minutes)</label>
            <input type="number" value={form.estimated_minutes} onChange={e=>update('estimated_minutes',e.target.value)} placeholder="e.g. 45" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2d7a4f]"/>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={submit} disabled={!form.title.trim()||loading} className="w-full flex items-center justify-center gap-2 bg-[#2d7a4f] text-white text-sm font-medium py-3 rounded-xl hover:bg-[#1f5537] disabled:opacity-50">
            {loading?<Loader2 size={14} className="animate-spin"/>:null}{loading?'Creating…':'Create task'}
          </button>
        </div>
      </div>
    </div>
  )
}
