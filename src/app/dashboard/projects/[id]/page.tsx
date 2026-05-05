'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Sparkles, Loader2, Pencil, Check, X, GitFork } from 'lucide-react'

const STATUSES = ['todo', 'in_progress', 'done', 'blocked'] as const
const STATUS_LABELS: Record<string, string> = {
  todo: 'To do', in_progress: 'In progress', done: 'Done', blocked: 'Blocked',
}
const PRIORITY_DOT: Record<string, string> = {
  urgent: '#dc2626', high: '#ea580c', medium: '#3b82f6', low: '#9ca3af',
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
  if (diff < 0) return '#dc2626'
  if (diff <= 1) return '#ea580c'
  return '#888'
}

type Task = { id: string; title: string; status: string; priority: string; deadline?: string | null; estimated_minutes?: number | null }
type Project = { id: string; name: string; colour: string; icon: string; description?: string | null }

export default function ProjectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [filter, setFilter] = useState<'all' | typeof STATUSES[number]>('all')

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then(r => r.json()),
      fetch(`/api/tasks?project_id=${id}`).then(r => r.json()),
    ]).then(([proj, t]) => {
      setProject(proj)
      setNameValue(proj?.name ?? '')
      setTasks(Array.isArray(t) ? t : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  async function saveName() {
    if (!project || !nameValue.trim()) return
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameValue }),
    })
    setProject(p => p ? { ...p, name: nameValue } : p)
    setEditingName(false)
  }

  async function toggleStatus(task: Task) {
    const next = task.status === 'done' ? 'todo' : 'done'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, completed_at: next === 'done' ? new Date().toISOString() : null }),
    })
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)
  const doneCount = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0
  const S = { fontFamily: 'DM Sans, sans-serif' }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, ...S }}>
      <Loader2 size={20} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!project) return <div style={{ padding: 40, textAlign: 'center', color: '#aaa', ...S }}>Project not found</div>

  return (
    <div style={{ padding: '28px 32px 60px', maxWidth: 760, margin: '0 auto', ...S }}>
      <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0, fontFamily: 'DM Sans, sans-serif' }}>
        <ArrowLeft size={14} />Projects
      </button>

      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: project.colour + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            {project.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input value={nameValue} onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                  autoFocus style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', border: 'none', borderBottom: '2px solid #2d7a4f', outline: 'none', background: 'transparent', flex: 1, fontFamily: 'DM Sans, sans-serif', padding: '2px 0' }} />
                <button onClick={saveName} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2d7a4f' }}><Check size={16} /></button>
                <button onClick={() => setEditingName(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}><X size={16} /></button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.01em', margin: 0 }}>{project.name}</h1>
                <button onClick={() => setEditingName(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 2 }}><Pencil size={13} /></button>
              </div>
            )}
            {project.description && <p style={{ fontSize: 13, color: '#888', marginTop: 3 }}>{project.description}</p>}
          </div>
          <Link href={`/dashboard/projects/${id}/mindmap`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: '#f3f3f1', color: '#555', border: '1px solid rgba(0,0,0,0.09)', textDecoration: 'none' }}>
            <GitFork size={13} />Mind map
          </Link>
        </div>
        <div style={{ height: 5, background: '#f0f0ee', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: project.colour, borderRadius: 3, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#bbb' }}>
          <span>{doneCount} of {tasks.length} tasks done</span><span>{pct}%</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
        <div style={{ display: 'flex', gap: 4, background: '#f3f3f1', borderRadius: 10, padding: 3 }}>
          {(['all', ...STATUSES] as const).map(s => {
            const count = s === 'all' ? tasks.length : tasks.filter(t => t.status === s).length
            return (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: 'none',
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
                background: filter === s ? '#fff' : 'transparent',
                color: filter === s ? '#2d7a4f' : '#888',
                boxShadow: filter === s ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}>
                {s === 'all' ? 'All' : STATUS_LABELS[s]} ({count})
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
          <Link href="/dashboard/extract" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: '#f0faf4', color: '#1f5537', border: '1px solid rgba(45,122,79,.2)', textDecoration: 'none' }}>
            <Sparkles size={12} />AI add
          </Link>
          <Link href="/dashboard/tasks/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: '#2d7a4f', color: '#fff', textDecoration: 'none' }}>
            <Plus size={12} />New task
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filtered.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#bbb', fontSize: 13 }}>
            {filter === 'all' ? 'No tasks yet — add one above' : `No ${STATUS_LABELS[filter]?.toLowerCase()} tasks`}
          </div>
        )}
        {filtered.map(task => (
          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', transition: 'border-color 0.12s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(45,122,79,0.2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.07)'}
          >
            <button onClick={() => toggleStatus(task)} style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              border: `1.5px solid ${task.status === 'done' ? '#2d7a4f' : '#ddd'}`,
              background: task.status === 'done' ? '#2d7a4f' : 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}>
              {task.status === 'done' && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l2.5 3L9 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_DOT[task.priority] ?? '#aaa', flexShrink: 0 }} />
            <Link href={`/dashboard/tasks/${task.id}`} style={{ flex: 1, fontSize: 13.5, color: task.status === 'done' ? '#aaa' : '#1a1a1a', textDecoration: task.status === 'done' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.title}
            </Link>
            {task.deadline && <span style={{ fontSize: 11, color: deadlineColor(task.deadline), flexShrink: 0, fontWeight: 500 }}>{fmtDeadline(task.deadline)}</span>}
            {task.estimated_minutes && <span style={{ fontSize: 10, color: '#ccc', flexShrink: 0 }}>{task.estimated_minutes}m</span>}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
