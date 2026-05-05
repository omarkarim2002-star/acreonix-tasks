'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Sparkles, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

type Task = {
  id: string
  title: string
  status: string
  priority: string
  deadline?: string | null
  completed_at?: string | null
  project?: { id: string; name: string; colour: string; icon: string } | null
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: '#dc2626', high: '#ea580c', medium: '#3b82f6', low: '#9ca3af',
}
const ACTIVE_FILTERS = ['all', 'todo', 'in_progress', 'blocked'] as const
type ActiveFilter = typeof ACTIVE_FILTERS[number]

function fmtDeadline(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff < 7) return `${diff}d`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
function deadlineColor(iso: string | null | undefined): string {
  if (!iso) return '#bbb'
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  if (diff < 0) return '#dc2626'
  if (diff <= 1) return '#ea580c'
  return '#888'
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [completed, setCompleted] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCompleted, setLoadingCompleted] = useState(false)
  const [filter, setFilter] = useState<ActiveFilter>('all')
  const [showCompleted, setShowCompleted] = useState(false)
  const [completedLoaded, setCompletedLoaded] = useState(false)

  const fetchActive = useCallback(async () => {
    setLoading(true)
    // Fetch all non-done tasks
    const res = await fetch('/api/tasks')
    const data = await res.json()
    const active = Array.isArray(data) ? data.filter((t: Task) => t.status !== 'done') : []
    setTasks(active)
    setLoading(false)
  }, [])

  useEffect(() => { fetchActive() }, [fetchActive])

  async function loadCompleted() {
    if (completedLoaded) { setShowCompleted(s => !s); return }
    setLoadingCompleted(true)
    setShowCompleted(true)
    const res = await fetch('/api/tasks?status=done')
    const data = await res.json()
    setCompleted(Array.isArray(data) ? data : [])
    setCompletedLoaded(true)
    setLoadingCompleted(false)
  }

  async function toggleStatus(task: Task) {
    const CYCLE: Record<string, string> = { todo: 'in_progress', in_progress: 'done', done: 'todo', blocked: 'todo' }
    const next = CYCLE[task.status] ?? 'todo'
    if (next === 'done') {
      // Optimistically move to completed
      setTasks(prev => prev.filter(t => t.id !== task.id))
      const done = { ...task, status: 'done', completed_at: new Date().toISOString() }
      setCompleted(prev => [done, ...prev])
      setCompletedLoaded(true)
    } else {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    }
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, completed_at: next === 'done' ? new Date().toISOString() : null }),
    })
  }

  async function uncomplete(task: Task) {
    setCompleted(prev => prev.filter(t => t.id !== task.id))
    setTasks(prev => [{ ...task, status: 'todo', completed_at: null }, ...prev])
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'todo', completed_at: null }),
    })
  }

  const filtered = tasks.filter(t => filter === 'all' || t.status === filter)
  const grouped = filtered.reduce<Record<string, Task[]>>((acc, t) => {
    const key = t.project?.name ?? 'No project'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const S: React.CSSProperties = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ padding: '32px 32px 60px', maxWidth: 760, margin: '0 auto', ...S }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: 6 }}>Tasks</h1>
          <div style={{ width: 24, height: 2, background: '#c9a84c', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard/extract" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: '#f0faf4', color: '#1f5537', border: '1px solid rgba(45,122,79,.2)', textDecoration: 'none' }}>
            <Sparkles size={13} />AI add
          </Link>
          <Link href="/dashboard/tasks/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: '#2d7a4f', color: '#fff', textDecoration: 'none' }}>
            <Plus size={13} />New task
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 22, flexWrap: 'wrap' }}>
        {ACTIVE_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            background: filter === f ? '#2d7a4f' : '#f3f3f1',
            color: filter === f ? '#fff' : '#666',
            transition: 'all 0.12s',
          }}>
            {f === 'all' ? 'All active' : f === 'in_progress' ? 'In progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Active tasks */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 48, borderRadius: 10, background: 'linear-gradient(90deg,#f0f0ee 25%,#e8e8e5 50%,#f0f0ee 75%)', backgroundSize: '400px 100%', animation: 'shimmer 1.4s ease infinite' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <CheckCircle2 size={36} style={{ color: '#e0e0dd', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#bbb', marginBottom: 16 }}>
            {filter === 'all' ? 'No active tasks.' : `No ${filter.replace('_', ' ')} tasks.`}
          </p>
          <Link href="/dashboard/extract" style={{ fontSize: 13, color: '#2d7a4f', textDecoration: 'none', background: '#f0faf4', padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(45,122,79,.2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={13} />Add tasks with AI
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(grouped).map(([project, ptasks]) => (
            <div key={project}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                {ptasks[0]?.project && <span style={{ fontSize: 14 }}>{ptasks[0].project.icon}</span>}
                <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{project}</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)', marginLeft: 4 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {ptasks.map(task => (
                  <div key={task.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 9,
                    background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
                    transition: 'border-color 0.12s',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.13)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.07)'}
                  >
                    <button onClick={() => toggleStatus(task)} style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: `1.5px solid ${task.status === 'in_progress' ? '#2d7a4f' : task.status === 'blocked' ? '#ef4444' : '#ddd'}`,
                      background: task.status === 'in_progress' ? 'rgba(45,122,79,0.1)' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}>
                      {task.status === 'in_progress' && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2d7a4f' }} />}
                      {task.status === 'blocked' && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />}
                    </button>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_DOT[task.priority] ?? '#9ca3af', flexShrink: 0 }} />
                    <Link href={`/dashboard/tasks/${task.id}`} style={{ flex: 1, fontSize: 13.5, color: '#1a1a1a', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </Link>
                    {task.deadline && (
                      <span style={{ fontSize: 11, color: deadlineColor(task.deadline), flexShrink: 0, fontWeight: 500 }}>
                        {fmtDeadline(task.deadline)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Completed tasks section ── */}
      <div style={{ marginTop: 36 }}>
        <button onClick={loadCompleted} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '11px 16px', borderRadius: 10,
          background: showCompleted ? '#f0faf4' : '#f9f9f7',
          border: `1px solid ${showCompleted ? 'rgba(45,122,79,.2)' : 'rgba(0,0,0,.08)'}`,
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
        }}>
          <CheckCircle2 size={15} style={{ color: showCompleted ? '#2d7a4f' : '#bbb', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: showCompleted ? '#1f5537' : '#888', flex: 1, textAlign: 'left' }}>
            Completed
            {completedLoaded && completed.length > 0 && (
              <span style={{ fontSize: 11, color: '#aaa', marginLeft: 6 }}>({completed.length})</span>
            )}
          </span>
          {loadingCompleted
            ? <span style={{ fontSize: 11, color: '#bbb' }}>Loading…</span>
            : showCompleted ? <ChevronUp size={14} style={{ color: '#aaa' }} /> : <ChevronDown size={14} style={{ color: '#aaa' }} />
          }
        </button>

        {showCompleted && !loadingCompleted && completed.length === 0 && (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#ccc', fontSize: 13 }}>No completed tasks yet</div>
        )}

        {showCompleted && completed.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {completed.map(task => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 9,
                background: '#f9f9f7', border: '1px solid rgba(0,0,0,0.05)',
              }}>
                <button onClick={() => uncomplete(task)} title="Mark as to-do" style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: '1.5px solid #2d7a4f', background: '#2d7a4f',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}>
                  <svg width="9" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 3L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <Link href={`/dashboard/tasks/${task.id}`} style={{ flex: 1, fontSize: 13, color: '#aaa', textDecoration: 'line-through', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </Link>
                {task.project && (
                  <span style={{ fontSize: 11, color: '#ccc', flexShrink: 0 }}>{task.project.name}</span>
                )}
                {task.completed_at && (
                  <span style={{ fontSize: 10, color: '#ccc', flexShrink: 0, marginLeft: 4 }}>
                    {new Date(task.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}`}</style>
    </div>
  )
}
