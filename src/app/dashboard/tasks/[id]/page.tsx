'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTimer } from '@/lib/TimerContext'
import { ArrowLeft, Trash2, Save, Loader2, Clock, Play, Square, Timer } from 'lucide-react'
import { cn, PRIORITY_COLOURS, STATUS_LABELS } from '@/lib/utils'
import type { Task, Project } from '@/types'

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
const STATUSES   = ['todo', 'in_progress', 'done', 'blocked'] as const

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export default function TaskDetailPage() {
  const { id }    = useParams()
  const router    = useRouter()
  const [task,     setTask]     = useState<Task & { project?: Project } | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Timer — use global context so it persists across pages
  const timer = useTimer()
  const [logged, setLogged] = useState(0)
  // For this task only — sync local "running"/"elapsed" with global state
  const isThisTask = timer.taskId === id
  const running    = isThisTask && timer.running
  const elapsed    = isThisTask ? timer.elapsed : 0

  useEffect(() => {
    fetch(`/api/tasks/${id}`).then(r => r.json()).then((t: Task) => {
      setTask(t)
      setLogged((t as any).logged_minutes ?? 0)
    })
    fetch('/api/projects').then(r => r.json()).then(setProjects)
  }, [id])



  function update(field: string, value: any) {
    setTask(prev => prev ? { ...prev, [field]: value } : prev)
  }

  async function save() {
    if (!task) return
    setSaving(true)
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title, description: task.description,
        status: task.status, priority: task.priority,
        deadline: task.deadline || null,
        estimated_minutes: task.estimated_minutes || null,
        project_id: task.project_id || null,
      }),
    })
    setSaving(false)
  }

  async function stopAndLog() {
    const { minsLogged } = await timer.stop()
    if (minsLogged > 0) setLogged(prev => prev + minsLogged)
  }

  async function deleteTask() {
    if (!confirm('Delete this task?')) return
    setDeleting(true)
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    router.push('/dashboard/tasks')
  }

  if (!task) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={20} className="animate-spin" style={{ color:'#9BA5A0' }} />
    </div>
  )

  const estMins    = task.estimated_minutes ?? 0
  const totalMins  = logged + Math.round(elapsed / 60)
  const pct        = estMins > 0 ? Math.min(100, Math.round(totalMins / estMins * 100)) : 0
  const overTime   = estMins > 0 && totalMins > estMins

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm mb-6 transition-colors" style={{ color:'#9BA5A0' }}>
        <ArrowLeft size={14} /> Tasks
      </button>

      <div className="rounded-2xl overflow-hidden" style={{ background:'#fff', boxShadow:'0 4px 16px rgba(16,19,18,0.08)' }}>

        {/* Title */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom:'1px solid #F7F8F5' }}>
          <input
            className="w-full text-2xl font-black outline-none bg-transparent"
            style={{ color:'#101312', letterSpacing:'-0.3px' }}
            value={task.title}
            onChange={e => update('title', e.target.value)}
            placeholder="Task title"
          />
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color:'#9BA5A0', letterSpacing:'0.8px' }}>STATUS</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map(s => (
                  <button key={s} onClick={() => update('status', s)}
                    className="text-xs px-2.5 py-1.5 rounded-full font-medium capitalize transition-all"
                    style={{
                      background: task.status === s ? '#0D3D2E' : '#F7F8F5',
                      color:      task.status === s ? '#fff' : '#9BA5A0',
                    }}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color:'#9BA5A0', letterSpacing:'0.8px' }}>PRIORITY</label>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map(p => (
                  <button key={p} onClick={() => update('priority', p)}
                    className="text-xs px-2.5 py-1.5 rounded-full font-medium capitalize transition-all"
                    style={{
                      background: task.priority === p ? '#0D3D2E' : '#F7F8F5',
                      color:      task.priority === p ? '#fff' : '#9BA5A0',
                    }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="text-xs font-bold mb-2 block" style={{ color:'#9BA5A0', letterSpacing:'0.8px' }}>PROJECT</label>
            <select value={task.project_id ?? ''}
              onChange={e => update('project_id', e.target.value || null)}
              className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
              style={{ background:'#F7F8F5', color:'#101312', border:'1px solid #EEEEE8' }}>
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
            </select>
          </div>

          {/* Deadline + Estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color:'#9BA5A0', letterSpacing:'0.8px' }}>DEADLINE</label>
              <input type="date"
                value={task.deadline ? task.deadline.split('T')[0] : ''}
                onChange={e => update('deadline', e.target.value ? `${e.target.value}T00:00:00Z` : null)}
                className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                style={{ background:'#F7F8F5', color:'#101312', border:'1px solid #EEEEE8' }}
              />
            </div>
            <div>
              <label className="text-xs font-bold mb-2 block" style={{ color:'#9BA5A0', letterSpacing:'0.8px' }}>ESTIMATE (mins)</label>
              <input type="number"
                value={task.estimated_minutes ?? ''}
                onChange={e => update('estimated_minutes', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="e.g. 30"
                className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                style={{ background:'#F7F8F5', color:'#101312', border:'1px solid #EEEEE8' }}
              />
            </div>
          </div>

          {/* ── TIME TRACKER ── */}
          <div className="rounded-xl p-4" style={{ background:'#F7F8F5', border:'1px solid #EEEEE8' }}>
            <div className="flex items-center gap-2 mb-3">
              <Timer size={14} style={{ color:'#0D3D2E' }} />
              <span className="text-xs font-bold" style={{ color:'#9BA5A0', letterSpacing:'0.8px' }}>TIME TRACKER</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Timer display */}
              <div className="flex-1">
                <div className="text-3xl font-black tabular-nums" style={{ color: overTime ? '#DC2626' : '#101312', letterSpacing:'-1px' }}>
                  {fmtTime(elapsed)}
                </div>
                <div className="text-xs mt-0.5" style={{ color:'#9BA5A0' }}>
                  {logged > 0 && <span>{logged}m logged · </span>}
                  {estMins > 0 && <span>{pct}% of {estMins}m estimate</span>}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {running ? (
                  <button onClick={stopAndLog}
                    className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition-all"
                    style={{ background:'#DC2626', color:'#fff' }}>
                    <Square size={13} fill="white" /> Stop & log
                  </button>
                ) : (
                  <button onClick={() => task && timer.start(task.id, task.title, task.estimated_minutes ?? undefined)}
                    className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl transition-all"
                    style={{ background:'#0D3D2E', color:'#fff' }}>
                    <Play size={13} fill="white" /> Start timer
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {estMins > 0 && (
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background:'#EEEEE8' }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${pct}%`,
                  background: overTime ? '#DC2626' : '#0D3D2E',
                }} />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold mb-2 block" style={{ color:'#9BA5A0', letterSpacing:'0.8px' }}>NOTES</label>
            <textarea value={task.description ?? ''}
              onChange={e => update('description', e.target.value)}
              placeholder="Add any extra notes…"
              rows={3}
              className="w-full text-sm px-3 py-2.5 rounded-xl outline-none resize-none"
              style={{ background:'#F7F8F5', color:'#101312', border:'1px solid #EEEEE8', lineHeight:'1.6' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop:'1px solid #F7F8F5' }}>
          <button onClick={deleteTask} disabled={deleting}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color:'#DC2626', opacity: deleting ? 0.5 : 1 }}>
            <Trash2 size={14} />
            {deleting ? 'Deleting…' : 'Delete task'}
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
            style={{ background:'#0D3D2E', color:'#fff', opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
