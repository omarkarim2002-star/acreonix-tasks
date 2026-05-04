'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Project, Task } from '@/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<(Project&{tasks:Task[]})[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(()=>{ fetch('/api/projects').then(r=>r.json()).then(d=>{setProjects(d);setLoading(false)}) },[])

  async function createProject() {
    if(!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:newName})})
    const p = await res.json()
    setProjects(prev=>[{...p,tasks:[]}, ...prev])
    setNewName(''); setShowNew(false); setCreating(false)
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 gold-underline" style={{fontFamily:'Georgia,serif'}}>Projects</h1>
        <button onClick={()=>setShowNew(true)} className="flex items-center gap-1.5 text-sm bg-[#2d7a4f] text-white px-3 py-1.5 rounded-lg hover:bg-[#1f5537]"><Plus size={14}/>New project</button>
      </div>
      {showNew&&(
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 flex gap-2 items-center">
          <input autoFocus type="text" value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createProject()} placeholder="Project name..." className="flex-1 text-sm focus:outline-none"/>
          <button onClick={()=>setShowNew(false)} className="text-xs text-gray-400 px-2">Cancel</button>
          <button onClick={createProject} disabled={!newName.trim()||creating} className="text-xs bg-[#2d7a4f] text-white px-3 py-1.5 rounded-lg disabled:opacity-50">{creating?'Creating…':'Create'}</button>
        </div>
      )}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_,i)=><div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse"/>)}</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map(project=>{
            const tasks=project.tasks??[]
            const done=tasks.filter(t=>t.status==='done').length
            const pct=tasks.length>0?Math.round((done/tasks.length)*100):0
            return (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 hover:border-[#2d7a4f]/30 hover:shadow-sm transition-all task-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{project.icon}</span>
                    <h2 className="text-sm font-semibold text-gray-900">{project.name}</h2>
                  </div>
                  <span className="text-xs text-gray-400">{tasks.length} tasks</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:project.colour??'#2d7a4f'}}/>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">{pct}% complete</p>
              </Link>
            )
          })}
          {projects.length===0&&<p className="text-sm text-gray-400 col-span-2 py-8 text-center">No projects yet</p>}
        </div>
      )}
    </div>
  )
}
