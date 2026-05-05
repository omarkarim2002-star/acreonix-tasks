'use client'

import { useState, useEffect } from 'react'
import { X, Check, Clock, Tag, AlertCircle, Calendar, Loader2, ExternalLink, Trash2 } from 'lucide-react'

type Task = {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  deadline?: string | null
  estimated_minutes?: number | null
  tags?: string[]
  task_type?: string
  schedulable_outside_hours?: boolean
  project?: { id: string; name: string; colour: string; icon: string } | null
}

const PRIORITY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  urgent: { bg: '#fff0f0', color: '#b91c1c', border: '#fecaca' },
  high:   { bg: '#fff4ee', color: '#c2410c', border: '#fed7aa' },
  medium: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  low:    { bg: '#f3f3f1', color: '#666',    border: '#e0e0dd' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  todo:        { label: 'To do',       color: '#888',    bg: '#f3f3f1' },
  in_progress: { label: 'In progress', color: '#2d7a4f', bg: '#f0faf4' },
  done:        { label: 'Done',        color: '#16a34a', bg: '#f0fdf4' },
  blocked:     { label: 'Blocked',     color: '#dc2626', bg: '#fff5f5' },
}

const TYPE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  work:     { label: 'Work',     color: '#1f5537', bg: '#f0faf4' },
  business: { label: 'Business', color: '#7a5e1a', bg: '#fdf8ee' },
  personal: { label: 'Personal', color: '#5b21b6', bg: '#f5f3ff' },
}

type Props = {
  taskId: string
  onClose: () => void
  onStatusChange?: (taskId: string, status: string) => void
  onDelete?: (taskId: string) => void
}

export function TaskDetailModal({ taskId, onClose, onStatusChange, onDelete }: Props) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [edited, setEdited] = useState<Partial<Task>>({})
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then(r => r.json())
      .then(data => { setTask(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [taskId])

  function update(field: string, value: unknown) {
    setEdited(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  async function save() {
    if (!isDirty || !task) return
    setSaving(true)
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edited),
    })
    const updated = await res.json()
    setTask(prev => ({ ...prev!, ...updated }))
    setEdited({})
    setIsDirty(false)
    setSaving(false)
  }

  async function cycleStatus() {
    if (!task) return
    const CYCLE: Record<string, string> = {
      todo: 'in_progress', in_progress: 'done', done: 'todo', blocked: 'todo',
    }
    const next = CYCLE[task.status] ?? 'todo'
    setSaving(true)
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, completed_at: next === 'done' ? new Date().toISOString() : null }),
    })
    setTask(prev => prev ? { ...prev, status: next } : null)
    onStatusChange?.(taskId, next)
    setSaving(false)
  }

  async function deleteTask() {
    if (!confirm('Delete this task?')) return
    setDeleting(true)
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    onDelete?.(taskId)
    onClose()
  }

  const merged = task ? { ...task, ...edited } : null
  const ps = PRIORITY_STYLE[merged?.priority ?? 'medium']
  const sc = STATUS_CONFIG[merged?.status ?? 'todo']

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        fontFamily: 'DM Sans, sans-serif',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16,
          width: '100%', maxWidth: 480,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          animation: 'modalIn 0.2s cubic-bezier(0.4,0,0.2,1) forwards',
        }}
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Loader2 size={18} style={{ color: '#2d7a4f', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#aaa' }}>Loading…</span>
          </div>
        ) : !merged ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Task not found</div>
        ) : (
          <>
            {/* Project stripe */}
            {merged.project && (
              <div style={{
                height: 4,
                background: merged.project.colour ?? '#2d7a4f',
              }} />
            )}

            {/* Header */}
            <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {/* Status circle */}
                <button
                  onClick={cycleStatus}
                  disabled={saving}
                  title="Click to change status"
                  style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    border: `2px solid ${merged.status === 'done' ? '#2d7a4f' : merged.status === 'in_progress' ? '#2d7a4f' : '#ddd'}`,
                    background: merged.status === 'done' ? '#2d7a4f' : merged.status === 'in_progress' ? 'rgba(45,122,79,0.12)' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  {merged.status === 'done' && (
                    <svg width="11" height="9" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 3L9 1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {merged.status === 'in_progress' && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2d7a4f' }} />
                  )}
                </button>

                {/* Title */}
                <textarea
                  value={merged.title}
                  onChange={e => update('title', e.target.value)}
                  onBlur={save}
                  rows={1}
                  style={{
                    flex: 1, border: 'none', outline: 'none', resize: 'none',
                    fontSize: 16, fontWeight: 600, color: merged.status === 'done' ? '#999' : '#111',
                    lineHeight: 1.4, fontFamily: 'DM Sans, sans-serif',
                    textDecoration: merged.status === 'done' ? 'line-through' : 'none',
                    background: 'transparent', overflow: 'hidden',
                  }}
                  onInput={e => {
                    const el = e.target as HTMLTextAreaElement
                    el.style.height = 'auto'
                    el.style.height = el.scrollHeight + 'px'
                  }}
                />

                <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 2, flexShrink: 0 }}>
                  <X size={16} />
                </button>
              </div>

              {/* Project tag */}
              {merged.project && (
                <div style={{ marginLeft: 32, marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 14 }}>{merged.project.icon}</span>
                  <span style={{ fontSize: 12, color: '#888' }}>{merged.project.name}</span>
                </div>
              )}
            </div>

            {/* Body */}
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Status + Priority row */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Status */}
                <select
                  value={merged.status}
                  onChange={e => { update('status', e.target.value); setTimeout(save, 100) }}
                  style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 7, border: 'none',
                    background: sc.bg, color: sc.color, fontWeight: 600,
                    cursor: 'pointer', outline: 'none', fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>

                {/* Priority */}
                <select
                  value={merged.priority}
                  onChange={e => { update('priority', e.target.value); setTimeout(save, 100) }}
                  style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 7, border: 'none',
                    background: ps.bg, color: ps.color, fontWeight: 600,
                    cursor: 'pointer', outline: 'none', fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  {['low', 'medium', 'high', 'urgent'].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>

                {/* Task type */}
                {merged.task_type && (
                  <div style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 7,
                    background: TYPE_STYLE[merged.task_type]?.bg ?? '#f3f3f1',
                    color: TYPE_STYLE[merged.task_type]?.color ?? '#666',
                    fontWeight: 500,
                  }}>
                    {TYPE_STYLE[merged.task_type]?.label ?? merged.task_type}
                  </div>
                )}
              </div>

              {/* Description */}
              <textarea
                value={merged.description ?? ''}
                onChange={e => update('description', e.target.value || null)}
                onBlur={save}
                placeholder="Add a description…"
                rows={2}
                style={{
                  width: '100%', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 8,
                  padding: '9px 11px', fontSize: 13, color: '#444', lineHeight: 1.6,
                  fontFamily: 'DM Sans, sans-serif', resize: 'none', outline: 'none',
                  background: '#fafaf8', boxSizing: 'border-box',
                  transition: 'border-color 0.12s',
                }}
                onFocus={e => (e.target as HTMLElement).style.borderColor = 'rgba(45,122,79,0.3)'}
                onBlurCapture={e => (e.target as HTMLElement).style.borderColor = 'rgba(0,0,0,0.09)'}
              />

              {/* Deadline + Estimate row */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#bbb', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={merged.deadline ? merged.deadline.split('T')[0] : ''}
                    onChange={e => update('deadline', e.target.value ? `${e.target.value}T00:00:00Z` : null)}
                    onBlur={save}
                    style={{
                      width: '100%', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 7,
                      padding: '7px 9px', fontSize: 12.5, color: '#444',
                      fontFamily: 'DM Sans, sans-serif', outline: 'none',
                      background: '#fafaf8', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: '#bbb', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Estimate (min)
                  </label>
                  <input
                    type="number"
                    value={merged.estimated_minutes ?? ''}
                    onChange={e => update('estimated_minutes', e.target.value ? Number(e.target.value) : null)}
                    onBlur={save}
                    placeholder="30"
                    min={5} step={5}
                    style={{
                      width: '100%', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 7,
                      padding: '7px 9px', fontSize: 12.5, color: '#444',
                      fontFamily: 'DM Sans, sans-serif', outline: 'none',
                      background: '#fafaf8', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 20px 16px',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <button
                onClick={deleteTask}
                disabled={deleting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, color: '#ef4444', background: 'none',
                  border: 'none', cursor: 'pointer', padding: '4px 0',
                  fontFamily: 'DM Sans, sans-serif', opacity: deleting ? 0.5 : 1,
                }}
              >
                <Trash2 size={13} />Delete
              </button>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isDirty && (
                  <button onClick={save} disabled={saving} style={{
                    fontSize: 12, fontWeight: 500, padding: '6px 14px',
                    background: '#2d7a4f', color: '#fff', border: 'none',
                    borderRadius: 7, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />}
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                )}
                <a
                  href={`/dashboard/tasks/${taskId}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 12, color: '#aaa', textDecoration: 'none',
                    padding: '6px 10px', borderRadius: 7,
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}
                >
                  <ExternalLink size={11} />Full page
                </a>
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`
        @keyframes modalIn{from{opacity:0;transform:scale(0.96) translateY(8px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}
