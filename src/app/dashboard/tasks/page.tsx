'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Filter, Search, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { TaskCheckbox } from '@/components/ui/TaskCheckbox'
import { useToast } from '@/components/ui/Toast'

type Task = {
  id: string
  title: string
  status: string
  priority: string
  deadline?: string
  project?: { name: string; colour: string }
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: '#fef2f2', text: '#dc2626', label: 'Urgent' },
  high:   { bg: '#fff3e8', text: '#c2610f', label: 'High' },
  medium: { bg: '#e8f0fb', text: '#2563eb', label: 'Medium' },
  low:    { bg: '#f1f3f6', text: '#5a6478', label: 'Low' },
}

function formatDeadline(d: string): string {
  const date = new Date(d)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000)
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function deadlineColour(d: string): string {
  const diffDays = Math.ceil((new Date(d).getTime() - new Date().getTime()) / 86400000)
  if (diffDays < 0) return '#dc2626'
  if (diffDays <= 1) return '#c2610f'
  return '#9aa3b4'
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all')
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(d => { setTasks(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function toggleComplete(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (newStatus === 'done') {
        toast(`"${task.title}" marked complete ✓`)
      }
    } catch {
      // Rollback on error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
      toast('Failed to update task', 'error')
    }
  }

  const filtered = tasks
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))

  const pending = tasks.filter(t => t.status !== 'done').length
  const done = tasks.filter(t => t.status === 'done').length

  const groupedDone = filtered.filter(t => t.status === 'done')
  const groupedPending = filtered.filter(t => t.status !== 'done')

  return (
    <div style={{ padding: '32px 32px 40px', maxWidth: 800, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
      <PageHeader
        title="Tasks"
        subtitle={`${pending} pending · ${done} completed`}
        action={
          <Link href="/dashboard/tasks/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#2d7a4f', color: '#fff', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            textDecoration: 'none', fontFamily: 'DM Sans, sans-serif',
          }}>
            <Plus size={14} />New task
          </Link>
        }
      />

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9aa3b4', pointerEvents: 'none' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 36, border: '1px solid #e8edf2', borderRadius: 8, fontSize: 13, color: '#141b2d', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all','todo','in_progress','done'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '7px 12px', fontSize: 12, fontWeight: 500, borderRadius: 7,
              border: '1px solid', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              background: filter === f ? '#2d7a4f' : '#fff',
              color: filter === f ? '#fff' : '#5a6478',
              borderColor: filter === f ? '#2d7a4f' : '#e8edf2',
            }}>
              {f === 'all' ? 'All' : f === 'in_progress' ? 'Active' : f === 'todo' ? 'To do' : 'Done'}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ height: 56, borderRadius: 10, background: '#f0f2f5', animation: 'shimmer 1.4s ease infinite', backgroundSize: '400px 100%', backgroundImage: 'linear-gradient(90deg, #f0f2f5 25%, #e8edf2 50%, #f0f2f5 75%)' }} />
          ))}
        </div>
      )}

      {!loading && tasks.length === 0 && (
        <EmptyState
          icon="✅"
          title="No tasks yet"
          description="Add your first tasks using AI extraction — paste any notes, emails or brain dump and AI organises everything."
          action={
            <Link href="/dashboard/extract" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#2d7a4f', color: '#fff', borderRadius: 8,
              padding: '9px 18px', fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
            }}>
              <Sparkles size={13} />Add tasks with AI
            </Link>
          }
        />
      )}

      {!loading && tasks.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No tasks match"
          description="Try a different search or filter."
          compact
        />
      )}

      {/* Pending tasks */}
      {groupedPending.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: groupedDone.length ? 20 : 0 }}>
          {groupedPending.map(task => (
            <TaskRow key={task.id} task={task} onToggle={() => toggleComplete(task)} />
          ))}
        </div>
      )}

      {/* Completed section */}
      {groupedDone.length > 0 && (filter === 'all' || filter === 'done') && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9aa3b4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Completed ({groupedDone.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {groupedDone.map(task => (
              <TaskRow key={task.id} task={task} onToggle={() => toggleComplete(task)} done />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, onToggle, done }: { task: Task; onToggle: () => void; done?: boolean }) {
  const p = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.low

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: done ? '#fafafa' : '#fff',
      border: '1px solid #e8edf2', borderRadius: 10,
      padding: '11px 14px',
      transition: 'border-color 0.15s, transform 0.15s',
      opacity: done ? 0.65 : 1,
      fontFamily: 'DM Sans, sans-serif',
    }}
      onMouseEnter={e => { if (!done) { (e.currentTarget as HTMLElement).style.borderColor = '#c8d4de'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e8edf2'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
    >
      <TaskCheckbox
        done={task.status === 'done'}
        onChange={onToggle}
        colour={task.project?.colour ?? '#2d7a4f'}
      />
      <Link href={`/dashboard/tasks/${task.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
        <p style={{
          fontSize: 13, fontWeight: 500, color: done ? '#9aa3b4' : '#141b2d',
          textDecoration: done ? 'line-through' : 'none', margin: 0,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {task.title}
        </p>
        {task.project && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: task.project.colour, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#9aa3b4' }}>{task.project.name}</span>
          </div>
        )}
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {task.deadline && (
          <span style={{ fontSize: 11, fontWeight: 500, color: deadlineColour(task.deadline) }}>
            {formatDeadline(task.deadline)}
          </span>
        )}
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
          background: p.bg, color: p.text,
        }}>
          {p.label}
        </span>
      </div>
    </div>
  )
}
