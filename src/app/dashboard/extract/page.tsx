'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Plus, Trash2, RefreshCw, Zap, Briefcase, User, Building2 } from 'lucide-react'
import Link from 'next/link'

type TaskType = 'work' | 'business' | 'personal'

type ExtractedTask = {
  title: string
  description?: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedMinutes?: number | null
  deadline?: string | null
  tags: string[]
  suggestedProject: string
  task_type: TaskType
  schedulable_outside_hours: boolean
}

type Preview = { tasks: ExtractedTask[]; projects: string[]; summary: string }

const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
  urgent: { bg: '#fff0f0', color: '#b91c1c' },
  high:   { bg: '#fff4ee', color: '#c2410c' },
  medium: { bg: '#eff6ff', color: '#1d4ed8' },
  low:    { bg: '#f3f3f1', color: '#666' },
}

const TYPE_CONFIG: Record<TaskType, { label: string; icon: typeof Briefcase; bg: string; color: string; border: string; hint: string }> = {
  work:     { label: 'Work',     icon: Briefcase,  bg: '#f0faf4', color: '#1f5537', border: '#c6e6d4', hint: 'During work hours only' },
  business: { label: 'Business', icon: Building2,  bg: '#fdf8ee', color: '#7a5e1a', border: '#e8d5a0', hint: 'Can flex to evenings' },
  personal: { label: 'Personal', icon: User,        bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe', hint: 'Evenings & weekends' },
}

function TaskTypeToggle({ value, onChange }: { value: TaskType; onChange: (v: TaskType) => void }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {(Object.keys(TYPE_CONFIG) as TaskType[]).map(type => {
        const cfg = TYPE_CONFIG[type]
        const Icon = cfg.icon
        const active = value === type
        return (
          <button
            key={type}
            onClick={() => onChange(type)}
            title={cfg.hint}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '2px 7px', borderRadius: 5, border: `1px solid ${active ? cfg.border : 'rgba(0,0,0,0.08)'}`,
              background: active ? cfg.bg : '#fff',
              color: active ? cfg.color : '#bbb',
              fontSize: 10, fontWeight: active ? 600 : 400,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.12s',
            }}
          >
            <Icon size={9} />
            {cfg.label}
          </button>
        )
      })}
    </div>
  )
}

export default function ExtractPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [existingProjects, setExistingProjects] = useState<string[]>([])
  const [extractsRemaining, setExtractsRemaining] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setExistingProjects(data.map((p: any) => p.name ?? '').filter(Boolean))
    }).catch(() => {})
  }, [])

  async function handleExtract() {
    if (!text.trim()) return
    setLoading(true); setError(''); setPreview(null)
    try {
      const res = await fetch('/api/extract-tasks/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? data.error ?? 'Something went wrong'); return }
      setPreview({
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        summary: data.summary ?? '',
      })
      if (typeof data.extractsRemaining === 'number') setExtractsRemaining(data.extractsRemaining)
    } catch { setError('Network error — please try again') } finally { setLoading(false) }
  }

  async function handleConfirm() {
    if (!preview || preview.tasks.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/extract-tasks/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: preview.tasks, originalText: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setSaved(true)
      setTimeout(() => router.push('/dashboard/tasks'), 1400)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  function updateTask(idx: number, field: string, value: unknown) {
    if (!preview) return
    const updated = [...preview.tasks]
    updated[idx] = { ...updated[idx], [field]: value }
    setPreview({ ...preview, tasks: updated })
  }

  function removeTask(idx: number) {
    if (!preview) return
    setPreview({ ...preview, tasks: preview.tasks.filter((_, i) => i !== idx) })
  }

  const allProjects = [...new Set([...existingProjects, ...(preview?.projects ?? [])])]

  const typeGroups = preview ? {
    work:     preview.tasks.filter(t => t.task_type === 'work'),
    business: preview.tasks.filter(t => t.task_type === 'business'),
    personal: preview.tasks.filter(t => t.task_type === 'personal'),
  } : null

  if (saved) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 12, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f0faf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle2 size={26} style={{ color: '#2d7a4f' }} />
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a' }}>Tasks saved!</h2>
      <p style={{ fontSize: 13, color: '#aaa' }}>Redirecting to your task list…</p>
    </div>
  )

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 720, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: '#2d7a4f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em' }}>AI Extract</h1>
        </div>
        <p style={{ fontSize: 13, color: '#888', marginLeft: 44 }}>Paste anything — notes, emails, a brain dump. AI extracts, classifies, and organises everything.</p>
        {extractsRemaining !== null && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, marginLeft: 44, background: '#fdf8ee', border: '1px solid #e8d5a0', borderRadius: 6, padding: '3px 9px' }}>
            <Zap size={11} style={{ color: '#c9a84c' }} />
            <span style={{ fontSize: 11, color: '#7a5e1a', fontWeight: 500 }}>{extractsRemaining} extract{extractsRemaining !== 1 ? 's' : ''} remaining</span>
          </div>
        )}
      </div>

      {/* Type legend */}
      {!preview && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {(Object.entries(TYPE_CONFIG) as [TaskType, typeof TYPE_CONFIG['work']][]).map(([type, cfg]) => {
            const Icon = cfg.icon
            return (
              <div key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <Icon size={11} style={{ color: cfg.color }} />
                <span style={{ fontSize: 11, color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
                <span style={{ fontSize: 10, color: cfg.color, opacity: 0.7 }}>— {cfg.hint}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Input */}
      {!preview && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.09)', overflow: 'hidden', marginBottom: 12 }}>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="e.g. Need to finish client proposal by Friday, go to gym 3x this week, fix the login bug, work on my side project landing page, book dentist appointment..."
            style={{ width: '100%', padding: '16px 18px', minHeight: 180, border: 'none', outline: 'none', resize: 'none', fontSize: 14, color: '#1a1a1a', lineHeight: 1.6, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
            disabled={loading}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fafaf8' }}>
            <span style={{ fontSize: 12, color: '#bbb' }}>{text.length} characters</span>
            <button onClick={handleExtract} disabled={!text.trim() || loading} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8,
              background: !text.trim() || loading ? '#e8e8e5' : '#2d7a4f',
              color: !text.trim() || loading ? '#aaa' : '#fff',
              border: 'none', cursor: !text.trim() || loading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans, sans-serif',
            }}>
              {loading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Extracting…</> : <><Sparkles size={14} />Extract tasks</>}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
          <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>{error}</p>
            {error.toLowerCase().includes('limit') && (
              <Link href="/dashboard/billing" style={{ fontSize: 12, color: '#2d7a4f', marginTop: 4, display: 'inline-block' }}>Upgrade for unlimited extracts →</Link>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div>
          {/* Summary banner */}
          <div style={{ background: '#f0faf4', border: '1px solid #c6e6d4', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1f5537', marginBottom: 3 }}>
                ✨ {preview.tasks.length} tasks extracted
              </p>
              <p style={{ fontSize: 12, color: '#888' }}>{preview.summary}</p>
              {typeGroups && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {(Object.entries(typeGroups) as [TaskType, ExtractedTask[]][]).filter(([, tasks]) => tasks.length > 0).map(([type, tasks]) => {
                    const cfg = TYPE_CONFIG[type]
                    const Icon = cfg.icon
                    return (
                      <div key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 5, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <Icon size={10} style={{ color: cfg.color }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: cfg.color }}>{tasks.length} {cfg.label.toLowerCase()}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <button onClick={() => { setPreview(null); setError('') }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#888', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', flexShrink: 0, fontFamily: 'DM Sans, sans-serif' }}>
              <RefreshCw size={12} />Re-extract
            </button>
          </div>

          {/* Scheduling info callout */}
          <div style={{ background: '#fdf8ee', border: '1px solid #e8d5a0', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#7a5e1a', margin: '0 0 2px' }}>Review task types before saving</p>
              <p style={{ fontSize: 11, color: '#a07a2a', lineHeight: 1.5, margin: 0 }}>
                <span style={{ color: '#1f5537', fontWeight: 600 }}>Work</span> tasks are scheduled during your work hours.{' '}
                <span style={{ color: '#c9a84c', fontWeight: 600 }}>Business</span> and{' '}
                <span style={{ color: '#7c3aed', fontWeight: 600 }}>Personal</span> tasks can be scheduled in evenings and weekends.
                Adjust any type below if the AI got it wrong.
              </p>
            </div>
          </div>

          {/* Task list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {preview.tasks.map((task, idx) => {
              const ps = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.medium
              const tc = TYPE_CONFIG[task.task_type] ?? TYPE_CONFIG.work
              const TypeIcon = tc.icon

              return (
                <div key={idx} style={{ background: '#fff', border: `1px solid rgba(0,0,0,0.08)`, borderLeft: `3px solid ${tc.border}`, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {/* Type indicator */}
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: tc.bg, border: `1px solid ${tc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <TypeIcon size={11} style={{ color: tc.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        value={task.title}
                        onChange={e => updateTask(idx, 'title', e.target.value)}
                        placeholder="Task title…"
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13.5, fontWeight: 500, color: '#1a1a1a', fontFamily: 'DM Sans, sans-serif', background: 'transparent' }}
                      />
                      {task.description && <p style={{ fontSize: 11, color: '#bbb', marginTop: 2, lineHeight: 1.4 }}>{task.description}</p>}
                    </div>
                    <button onClick={() => removeTask(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', padding: 2, marginTop: 1 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Meta row */}
                  <div style={{ padding: '4px 14px 10px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>

                    {/* Task type toggle */}
                    <TaskTypeToggle
                      value={task.task_type}
                      onChange={type => {
                        updateTask(idx, 'task_type', type)
                        // Auto-set outside hours based on type
                        updateTask(idx, 'schedulable_outside_hours', type !== 'work')
                      }}
                    />

                    {/* Project */}
                    <select value={task.suggestedProject} onChange={e => updateTask(idx, 'suggestedProject', e.target.value)}
                      style={{ fontSize: 11, padding: '2px 18px 2px 7px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 5, background: '#fafafa', color: '#444', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', outline: 'none', appearance: 'none' }}>
                      {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    {/* Priority */}
                    <select value={task.priority} onChange={e => updateTask(idx, 'priority', e.target.value as any)}
                      style={{ fontSize: 11, padding: '2px 18px 2px 7px', borderRadius: 5, border: 'none', fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'DM Sans, sans-serif', background: ps.bg, color: ps.color, appearance: 'none' }}>
                      {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    {/* Outside hours toggle */}
                    <button
                      onClick={() => updateTask(idx, 'schedulable_outside_hours', !task.schedulable_outside_hours)}
                      title={task.schedulable_outside_hours ? 'Can be scheduled outside work hours' : 'Work hours only'}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 7px', borderRadius: 5, border: '1px solid',
                        borderColor: task.schedulable_outside_hours ? '#ddd6fe' : 'rgba(0,0,0,0.08)',
                        background: task.schedulable_outside_hours ? '#f5f3ff' : '#f9f9f7',
                        color: task.schedulable_outside_hours ? '#7c3aed' : '#bbb',
                        fontSize: 10, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                      }}
                    >
                      {task.schedulable_outside_hours ? '🌙 Flexible' : '🏢 Work hours'}
                    </button>

                    {task.estimatedMinutes && (
                      <span style={{ fontSize: 11, color: '#bbb', background: '#f3f3f1', padding: '2px 6px', borderRadius: 5 }}>{task.estimatedMinutes}m</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add task */}
          <button
            onClick={() => setPreview(prev => prev ? {
              ...prev,
              tasks: [...prev.tasks, { title: '', priority: 'medium', tags: [], suggestedProject: allProjects[0] ?? 'General', task_type: 'work', schedulable_outside_hours: false }]
            } : prev)}
            style={{ width: '100%', padding: '10px 0', marginBottom: 20, border: '1px dashed rgba(0,0,0,0.15)', borderRadius: 10, background: '#fff', color: '#aaa', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'DM Sans, sans-serif' }}
          >
            <Plus size={14} />Add a task manually
          </button>

          {/* Sticky confirm */}
          <div style={{ position: 'sticky', bottom: 16, background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{preview.tasks.length} task{preview.tasks.length !== 1 ? 's' : ''} ready to save</p>
              <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>Types locked in — AI scheduler will respect them</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setPreview(null)} style={{ padding: '8px 14px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#888', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
              <button onClick={handleConfirm} disabled={saving || preview.tasks.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: saving ? '#e8e8e5' : '#2d7a4f', color: saving ? '#aaa' : '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}>
                {saving ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />Saving…</> : <><CheckCircle2 size={13} />Confirm & save</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
