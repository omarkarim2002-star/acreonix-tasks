'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, Download, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import type { Task } from '@/types'

const STATUSES = ['all', 'todo', 'in_progress', 'done', 'blocked'] as const
const STATUS_LABELS: Record<string, string> = {
  todo: 'To do', in_progress: 'In progress', done: 'Done', blocked: 'Blocked'
}
const PRIORITY_DOT: Record<string, string> = {
  urgent: '#dc2626', high: '#ea580c', medium: '#3b82f6', low: '#9ca3af'
}

function fmtDeadline(iso: string): string {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 6) return `${diff}d`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
function deadlineColor(iso: string): string {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  return diff < 0 ? '#dc2626' : diff <= 1 ? '#ea580c' : '#aaa'
}

type TaskWithProject = Task & { project?: { name: string; colour: string; icon: string } }

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done' | 'blocked'>('all')
  const [showDone, setShowDone] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/tasks')
    const data = await res.json()
    setTasks(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  async function toggleDone(task: TaskWithProject) {
    const next = task.status === 'done' ? 'todo' : 'done'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, completed_at: next === 'done' ? new Date().toISOString() : null }),
    })
  }

  function exportCSV() {
    const a = document.createElement('a')
    a.href = '/api/export-tasks'
    a.download = ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const active = tasks.filter(t => t.status !== 'done')
  const done = tasks.filter(t => t.status === 'done')

  const filtered = filter === 'all'
    ? active
    : filter === 'done'
    ? done
    : active.filter(t => t.status === filter)

  // Group by project
  const grouped = filtered.reduce<Record<string, TaskWithProject[]>>((acc, t) => {
    const key = t.project?.name ?? 'No project'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const S = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 760, margin: '0 auto', ...S }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: 4 }}>Tasks</h1>
          <div style={{ width: 24, height: 2, background: '#c9a84c', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'8px 12px', borderRadius:8, fontSize:12.5, fontWeight:500, background:'#f3f3f1', color:'#555', border:'1px solid rgba(0,0,0,0.1)', cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
            <Download size={13} />Export
          </button>
          <Link href="/dashboard/extract" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'8px 13px', borderRadius:8, fontSize:12.5, fontWeight:500, background:'#f0faf4', color:'#1f5537', border:'1px solid rgba(45,122,79,.2)', textDecoration:'none' }}>
            <Sparkles size={13} />AI add
          </Link>
          <Link href="/dashboard/tasks/new" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'8px 14px', borderRadius:8, fontSize:12.5, fontWeight:600, background:'#2d7a4f', color:'#fff', textDecoration:'none', boxShadow:'0 2px 6px rgba(45,122,79,0.2)' }}>
            <Plus size={13} />New task
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:4, background:'#f3f3f1', borderRadius:10, padding:3, marginBottom:20, overflowX:'auto' }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:500, border:'none',
            cursor:'pointer', fontFamily:'DM Sans,sans-serif', whiteSpace:'nowrap',
            background: filter === s ? '#fff' : 'transparent',
            color: filter === s ? '#2d7a4f' : '#888',
            boxShadow: filter === s ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
          }}>
            {s === 'all' ? 'All active' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:200, gap:10 }}>
          <Loader2 size={18} style={{ color:'#2d7a4f', animation:'spin 1s linear infinite' }} />
          <span style={{ fontSize:13, color:'#aaa' }}>Loading tasks…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && tasks.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 0' }}>
          <p style={{ fontSize:14, color:'#bbb', marginBottom:16 }}>No tasks yet</p>
          <Link href="/dashboard/extract" style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 20px', borderRadius:9, background:'#2d7a4f', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:600 }}>
            <Sparkles size={13} />Add tasks with AI
          </Link>
        </div>
      )}

      {/* Task groups */}
      {!loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
          {Object.entries(grouped).map(([projectName, projectTasks]) => (
            <div key={projectName}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:10, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.08em' }}>{projectName}</span>
                <div style={{ flex:1, height:1, background:'rgba(0,0,0,0.06)' }} />
                <span style={{ fontSize:10, color:'#ccc' }}>{projectTasks.length}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {projectTasks.map(task => (
                  <TaskRow key={task.id} task={task} onToggle={toggleDone} />
                ))}
              </div>
            </div>
          ))}

          {/* Completed accordion */}
          {done.length > 0 && filter !== 'done' && (
            <div>
              <button onClick={() => setShowDone(d => !d)} style={{
                display:'flex', alignItems:'center', gap:8, width:'100%',
                background:'rgba(0,0,0,0.03)', border:'1px solid rgba(0,0,0,0.06)',
                borderRadius:10, padding:'10px 14px', cursor:'pointer',
                fontFamily:'DM Sans,sans-serif',
              }}>
                {showDone ? <ChevronDown size={14} style={{ color:'#aaa' }} /> : <ChevronRight size={14} style={{ color:'#aaa' }} />}
                <span style={{ fontSize:12.5, fontWeight:500, color:'#888' }}>Completed ({done.length})</span>
              </button>
              {showDone && (
                <div style={{ display:'flex', flexDirection:'column', gap:3, marginTop:6 }}>
                  {done.map(task => <TaskRow key={task.id} task={task} onToggle={toggleDone} />)}
                </div>
              )}
            </div>
          )}

          {filter === 'done' && done.map(task => <TaskRow key={task.id} task={task} onToggle={toggleDone} />)}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function TaskRow({ task, onToggle }: { task: TaskWithProject; onToggle: (t: TaskWithProject) => void }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10,
      padding:'10px 14px', borderRadius:10,
      background:'#fff', border:'1px solid rgba(0,0,0,0.07)',
      transition:'border-color 0.12s',
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(45,122,79,0.2)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.07)'}
    >
      {/* Status circle */}
      <button onClick={() => onToggle(task)} style={{
        width:20, height:20, borderRadius:'50%', flexShrink:0, padding:0,
        background: task.status === 'done' ? '#2d7a4f' : 'transparent',
        border: task.status === 'done' ? '1.5px solid #2d7a4f' : '1.5px solid #ddd' as any,
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
        transition:'all 0.15s',
      }}>
        {task.status === 'done' && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l2.5 3L9 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Priority dot */}
      <div style={{ width:6, height:6, borderRadius:'50%', background: PRIORITY_DOT[task.priority] ?? '#aaa', flexShrink:0 }} />

      {/* Title */}
      <Link href={`/dashboard/tasks/${task.id}`} style={{
        flex:1, fontSize:13.5, color: task.status === 'done' ? '#aaa' : '#1a1a1a',
        textDecoration: task.status === 'done' ? 'line-through' : 'none',
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
      }}>
        {task.title}
      </Link>

      {/* Deadline */}
      {task.deadline && (
        <span style={{ fontSize:11, color: deadlineColor(task.deadline), flexShrink:0, fontWeight:500 }}>
          {fmtDeadline(task.deadline)}
        </span>
      )}

      {/* Estimate */}
      {task.estimated_minutes && (
        <span style={{ fontSize:10, color:'#ccc', flexShrink:0 }}>{task.estimated_minutes}m</span>
      )}
    </div>
  )
}
